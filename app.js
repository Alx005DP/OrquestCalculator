const NOCTURNIDAD_5_PERCENT = 0.0326;
const NOCTURNIDAD_25_PERCENT = 0.25;
const COTIZACION_CONT_COMU = 0.0482;
const COTIZACION_FORMACION = 0.001;
const COTIZACION_DESEMPLEO = 0.0155;
async function performOCR() {
    const imageFiles = document.getElementById('image-input').files;
    const jornadaSemanal = parseFloat(document.getElementById('jornada-laboral').value) || 20; // Por defecto 20h

    if (!imageFiles.length) {
        alert("Por favor selecciona al menos una imagen.");
        return;
    }

    let todasLasSemanas = [];

    // Cada imagen es una semana
    for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("apikey", "K84733993588957");
        formData.append("language", "spa");
        formData.append("isOverlayRequired", false);
        formData.append("OCREngine", 2);
        formData.append("file", imageFiles[i]);

        try {
            const response = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            if (result.IsErroredOnProcessing) {
                document.getElementById('result').innerText = `Error procesando la imagen ${i + 1}`;
            } else {
                const parsedText = result.ParsedResults[0].ParsedText;
                const horariosSemana = filtrarHorarios(parsedText);
                const resultadosSemana = calcularHorasSemana(horariosSemana, jornadaSemanal, i + 1);
                todasLasSemanas.push(resultadosSemana);
            }
        } catch (error) {
            console.error("Error en el procesamiento OCR:", error);
            document.getElementById('result').innerText = `Error procesando la imagen ${i + 1}`;
        }
    }

    if (todasLasSemanas.length > 0) {
        mostrarResultados(todasLasSemanas);
    } else {
        document.getElementById('result').innerText = "No se encontraron horarios válidos en las imágenes.";
    }
}

function filtrarHorarios(text) {
    const lineas = text.split('\n');
    const horarios = [];
    const regex = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

    lineas.forEach(linea => {
        if (regex.test(linea.trim())) {
            horarios.push(linea.trim());
        }
    });

    return horarios;
}

function calcularHorasSemana(horarios, jornadaSemanal, numSemana) {
    let horasTotalesSemana = 0;
    const detallesDias = [];

    // Calcular las horas totales por día
    horarios.forEach((horario, index) => {
        const [inicio, fin] = horario.split('-');
        const [horaInicio, minInicio] = inicio.split(':').map(Number);
        let [horaFin, minFin] = fin.split(':').map(Number);

        // Ajustar si el horario cruza la medianoche
        if (horaFin < horaInicio) {
            horaFin += 24;
        }

        const horasDia = (horaFin - horaInicio) + (minFin - minInicio) / 60;
        horasTotalesSemana += horasDia;

        detallesDias.push({
            dia: index + 1,
            horario,
            horas: horasDia
        });
    });

    // Separar horas ordinarias y complementarias
    let horasOrdinarias = Math.min(horasTotalesSemana, jornadaSemanal);
    let horasComplementarias = Math.max(0, horasTotalesSemana - jornadaSemanal);

    // Distribuir proporcionalmente las horas en cada día
    detallesDias.forEach(dia => {
        const proporcion = dia.horas / horasTotalesSemana;
        dia.horasOrdinarias = horasOrdinarias * proporcion;
        dia.horasComplementarias = horasComplementarias * proporcion;
    });

    return {
        numSemana,
        horasOrdinarias,
        horasComplementarias,
        horasTotales: horasTotalesSemana,
        detallesDias
    };
}

function mostrarResultados(semanas) {
    let totalOrdinarias = 0;
    let totalComplementarias = 0;

    const resultadoHTML = semanas.map(semana => {
        totalOrdinarias += semana.horasOrdinarias;
        totalComplementarias += semana.horasComplementarias;

        return `
    <h4>Semana ${semana.numSemana}:</h4>
    <p>Horas ordinarias: ${semana.horasOrdinarias.toFixed(2)}</p>
    <p>Horas complementarias: ${semana.horasComplementarias.toFixed(2)}</p>
    <p>Total horas: ${semana.horasTotales.toFixed(2)}</p>
    <h5>Detalle diario:</h5>
    ${semana.detallesDias.map(dia => `
        <p>Día ${dia.dia}: ${dia.horario} 
           (${dia.horasOrdinarias.toFixed(2)} ordinarias, 
            ${dia.horasComplementarias.toFixed(2)} complementarias)</p>
    `).join('')}
    <hr>
`;
    }).join('');

    document.getElementById('result').innerHTML = `
<h3>Resumen Total:</h3>
<p>Total Horas Ordinarias: ${totalOrdinarias.toFixed(2)}</p>
<p>Total Horas Complementarias: ${totalComplementarias.toFixed(2)}</p>
<p>Total Horas: ${(totalOrdinarias + totalComplementarias).toFixed(2)}</p>
<hr>
${resultadoHTML}
`;

    console.log(calcularSalario(totalOrdinarias, totalComplementarias))

    function calcularSalario(horasOrdinarias, horasComplementarias) {
        const precioHoraNormal = document.getElementById("tarifa-normal").value;
        const precioHoraComplementaria = document.getElementById("horascomplementarias").value;

        // Cálculo del salario baseF
        const salarioBase = calcularSalarioBase(horasOrdinarias, precioHoraNormal);

        // Cálculo de nocturnidad
        const nocturnidad5 = calcularNocturnidad5(18, 0.326);
        const nocturnidad25 = calcularNocturnidad25(5.5, 1.631);

        // Cálculo de horas complementarias
        const importeHorasComplementarias = calcularHorasComplementarias(horasComplementarias, precioHoraComplementaria);

        // Cálculo de manutencion
        const manutencion = calcularManutencion(21, 0.36);

        // Cálculo de deducciones
        const deducciones = calcularDeducciones(salarioBase + importeHorasComplementarias + nocturnidad5 + nocturnidad25);

        // Cálculo del total
        const totalDevengado = salarioBase + nocturnidad5 + nocturnidad25 + importeHorasComplementarias + manutencion;

        document.getElementById("salario-total").innerText = "Salario Aprox: " + totalDevengado

        return {
            salarioBase,
            nocturnidad5,
            nocturnidad25,
            importeHorasComplementarias,
            manutencion,
            deducciones,
            totalDevengado,
            totalDeducir: deducciones.total
        };
    }

    function calcularSalarioBase(horas, precioHora) {
        return Number((horas * precioHora).toFixed(2));
    }

    function calcularNocturnidad5(horas, precio) {
        return Number((horas * precio).toFixed(2));
    }

    function calcularNocturnidad25(horas, precio) {
        return Number((horas * precio).toFixed(2));
    }

    function calcularHorasComplementarias(horas, precioHora) {
        return Number((horas * precioHora).toFixed(2));
    }

    function calcularManutencion(dias, precio) {
        return Number((dias * precio).toFixed(2));
    }

    function calcularDeducciones(baseCalculo) {
        const dctoEspecie = 7.56;
        const cotizacionContComu = Number((baseCalculo * COTIZACION_CONT_COMU).toFixed(2));
        const cotizacionFormacion = Number((baseCalculo * COTIZACION_FORMACION).toFixed(2));
        const cotizacionDesempleo = Number((baseCalculo * COTIZACION_DESEMPLEO).toFixed(2));

        return {
            dctoEspecie,
            cotizacionContComu,
            cotizacionFormacion,
            cotizacionDesempleo,
            total: Number((dctoEspecie + cotizacionContComu + cotizacionFormacion + cotizacionDesempleo).toFixed(2))
        };
    }

}