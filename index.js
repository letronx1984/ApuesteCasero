
const API_URL = "https://9faa-2800-200-e4a0-ed-e1a3-60a4-16e8-e116.ngrok-free.app/api/usuarios";
//localhost:8003
let ipDispositivoUsuario = "";


document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    obtenerIdentificadorDispositivo();


    obtenerUsuariosBackend();
});

function obtenerIpDispositivo() {
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            ipDispositivoUsuario = data.ip;
            console.log("IP del dispositivo detectada con éxito:", ipDispositivoUsuario);
        })
        .catch(error => {
            console.error("Error al obtener la IP pública, usando IP de respaldo:", error);

            ipDispositivoUsuario = "127.0.0.1";
        });
}
function obtenerIdentificadorDispositivo() {

    let deviceId = localStorage.getItem('apueste_casero_device_id');

    if (!deviceId) {

        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {

            deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        localStorage.setItem('apueste_casero_device_id', deviceId);
        console.log("Nuevo identificador de dispositivo generado y guardado:", deviceId);
    } else {
        console.log("Dispositivo reconocido con éxito. ID:", deviceId);
    }


    ipDispositivoUsuario = deviceId;
}

function obtenerUsuariosBackend() {
    fetch(API_URL, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(usuariosDesdeBD => {
            console.log("Datos recibidos desde Spring Boot:", usuariosDesdeBD);
            renderTable(usuariosDesdeBD);
        })
        .catch(error => {
            console.error("Error al conectar con la API (GET):", error);
            mostrarErrorEnTabla();
        });
}

document.getElementById('apuestaForm').addEventListener('submit', function (e) {
    e.preventDefault();


    const nuevaApuesta = {
        nombreUsuario: document.getElementById('nombreUsuario').value,
        paisUno: document.getElementById('paisUno').value,
        paisDos: document.getElementById('paisDos').value,
        resultadoUno: parseInt(document.getElementById('resultadoUno').value, 10) || 0,
        resultadoDos: parseInt(document.getElementById('resultadoDos').value, 10) || 0,
        direccionIp: ipDispositivoUsuario
    };

    console.log("Enviando este JSON a Spring Boot:", JSON.stringify(nuevaApuesta));


    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(nuevaApuesta)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo guardar la apuesta en el servidor.');
            }
            return response.json();
        })
        .then(usuarioGuardado => {
            console.log("Apuesta registrada exitosamente en BD:", usuarioGuardado);
            toggleModal(false);
            obtenerUsuariosBackend();
        })
        .catch(error => {
            console.error("Error al conectar con la API (POST):", error);
            alert("⚠️ Hubo un error al guardar la apuesta. Puede que esta IP o nombre de usuario ya hayan realizado un registro.");
        });
});

function renderTable(listaUsuarios) {
    const tbody = document.getElementById('tabla-usuarios');
    tbody.innerHTML = '';

    if (!listaUsuarios || listaUsuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-sm text-slate-500">
                    No hay apuestas registradas en la base de datos.
                </td>
            </tr>
        `;
        actualizarEstadisticas(0, 0, 0);
        return;
    }

    let votosBrasil = 0;
    let votosHaiti = 0;

    listaUsuarios.forEach(user => {
        if (user.resultadoUno > user.resultadoDos) votosBrasil++;
        else if (user.resultadoDos > user.resultadoUno) votosHaiti++;
    
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-900/40 transition-colors";
        
        row.innerHTML = `
            <td class="py-4 px-6 text-sm font-semibold text-slate-200">
                <div class="flex items-center gap-2 justify-start">
                    <div class="w-7 h-7 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 uppercase">
                        ${user.nombreUsuario ? user.nombreUsuario.charAt(0) : '?'}
                    </div>
                    <span class="truncate">${user.nombreUsuario}</span>
                </div>
            </td>
            
            <td class="py-4 px-6 text-sm">
                <div class="flex items-center gap-2 justify-center">
                    <span class="text-slate-400 text-xs">🇧🇷 ${user.paisUno}</span>
                    <span class="text-slate-600 text-xs font-bold">vs</span>
                    <span class="text-slate-400 text-xs">🇭🇹 ${user.paisDos}</span>
                </div>
            </td>
            
            <td class="py-4 px-6 text-center">
                <span class="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-slate-100 font-mono tracking-wider">
                    ${user.resultadoUno} - ${user.resultadoDos}
                </span>
            </td>
        `;
    
        tbody.appendChild(row);
    });

    const total = listaUsuarios.length;
    const pctBrasil = total > 0 ? Math.round((votosBrasil / total) * 100) : 0;
    const pctHaiti = total > 0 ? Math.round((votosHaiti / total) * 100) : 0;

    actualizarEstadisticas(total, pctBrasil, pctHaiti);
}

function actualizarEstadisticas(total, pctBrasil, pctHaiti) {
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-brasil').innerText = `${pctBrasil}%`;
    document.getElementById('stat-haiti').innerText = `${pctHaiti}%`;
}

function mostrarErrorEnTabla() {
    const tbody = document.getElementById('tabla-usuarios');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="py-8 text-center text-sm text-red-400 font-semibold">
                ⚠️ No se pudo conectar con el servidor Backend. Verifica que Spring Boot esté levantado.
            </td>
        </tr>
    `;
    actualizarEstadisticas("Error", 0, 0);
}

function verPayload(user) {
    const rawJson = {
        nombreUsuario: user.nombreUsuario,
        paisUno: user.paisUno,
        paisDos: user.paisDos,
        resultadoUno: user.resultadoUno,
        resultadoDos: user.resultadoDos,
        direccionIp: user.direccionIp
    };
    document.getElementById('json-preview').innerText = JSON.stringify(rawJson, null, 4);
    toggleJsonModal(true);
}

function toggleJsonModal(show) {
    const modal = document.getElementById('json-modal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function toggleModal(show) {
    const modal = document.getElementById('apuesta-modal');
    if (show) {
        modal.classList.remove('hidden');
        document.getElementById('nombreUsuario').focus();
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        modal.classList.add('hidden');
        document.getElementById('apuestaForm').reset();
    }
}