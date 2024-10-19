document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        
        // Aquí usamos Tesseract.js para extraer texto de la imagen
        Tesseract.recognize(
            img.src,
            'spa', // Idioma español
            { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
            console.log('Texto extraído:', text);

            // Procesar el texto para extraer los horarios
            const horarios = procesarHorarios(text);
            console.log('Horarios extraídos:', horarios);

            // Definir tarifas (en dólares o euros)
            const tarifaPorHora = 10; // Ejemplo: 10 €/hora
            const tarifaNocturna = 15; // Ejemplo: 15 €/hora para horas nocturnas

            // Calcular salario basado en los horarios
            const salarioTotal = calcularSalario(horarios, tarifaPorHora, tarifaNocturna);
            document.getElementById('result').innerText = `Salario Total: ${salarioTotal}€`;
        });
    };

    reader.readAsDataURL(file);
});

// Procesar los horarios extraídos del texto
function procesarHorarios(text) {
    const lineas = text.split('\n');
    const horarios = [];

    lineas.forEach(linea => {
        // Detectar los horarios en formato "HH:MM - HH:MM"
        const match = linea.match(/(\d{2}:\d{2}) - (\d{2}:\d{2})/);
        if (match) {
            const inicio = match[1];
            const fin = match[2];
            horarios.push({ inicio, fin });
        }
    });

    return horarios;
}

// Calcular salario en base a los horarios extraídos
function calcularSalario(horarios, tarifaPorHora, tarifaNocturna) {
    let salarioTotal = 0;

    horarios.forEach(horario => {
        const horasTrabajadas = calcularHoras(horario.inicio, horario.fin);
        const horasNocturnas = contarHorasNocturnas(horario.inicio, horario.fin);
        const horasNormales = horasTrabajadas - horasNocturnas;

        salarioTotal += (horasNormales * tarifaPorHora) + (horasNocturnas * tarifaNocturna);
    });

    return salarioTotal;
}

// Función para calcular la diferencia de horas
function calcularHoras(inicio, fin) {
    const [inicioHoras, inicioMinutos] = inicio.split(':').map(Number);
    const [finHoras, finMinutos] = fin.split(':').map(Number);

    let diferenciaHoras = finHoras - inicioHoras;
    let diferenciaMinutos = finMinutos - inicioMinutos;

    if (diferenciaMinutos < 0) {
        diferenciaMinutos += 60;
        diferenciaHoras -= 1;
    }

    if (diferenciaHoras < 0) {
        diferenciaHoras += 24; // Manejo de horarios nocturnos que cruzan medianoche
    }

    return diferenciaHoras + (diferenciaMinutos / 60);
}

// Función para contar cuántas horas trabajadas caen en horas nocturnas
function contarHorasNocturnas(inicio, fin) {
    const nocturnidadInicio = 22;
    const nocturnidadFin = 6;

    const [inicioHoras, inicioMinutos] = inicio.split(':').map(Number);
    const [finHoras, finMinutos] = fin.split(':').map(Number);

    let horasNocturnas = 0;

    // Contar cuántas horas trabajadas están entre 22:00 y 06:00
    for (let hora = inicioHoras; hora != finHoras; hora = (hora + 1) % 24) {
        if ((hora >= nocturnidadInicio && hora < 24) || (hora >= 0 && hora < nocturnidadFin)) {
            horasNocturnas++;
        }
    }

    return horasNocturnas;
}
