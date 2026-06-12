const API_BASE = "http://localhost";
let JWT_TOKEN = "";

// =====================================================================
// 🔐 1. CONTROL DE ACCESO (MICROSERVICIO AUTH)
// =====================================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const alertBox = document.getElementById('login-alert');

    try {
        // Probamos con la URL extendida completa que tu FastAPI generó internamente
        const response = await fetch(`${API_BASE}/auth/api/v1/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json; charset=UTF-8' // Forzamos codificación limpia
            },
            body: JSON.stringify({ 
                "nombre_usuario": user, 
                "contraseña": pass 
            })
        });

        // Si da error de ruta, hacemos un intento automático a la ruta corta
        if (response.status === 404 || response.status === 405) {
            const fallbackResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ "nombre_usuario": user, "contraseña": pass })
            });
            if (!fallbackResponse.ok) throw new Error("Usuario o contraseña incorrectos");
            var data = await fallbackResponse.json();
        } else {
            if (!response.ok) throw new Error("Usuario o contraseña incorrectos");
            var data = await response.json();
        }

        JWT_TOKEN = data.access_token || data.token;

        // Cambio visual de pantallas si todo marcha bien
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-panel').classList.remove('d-none');
        document.getElementById('user-badge').classList.remove('d-none');

        cargarProductosREST();

    } catch (error) {
        alertBox.innerText = error.message;
        alertBox.classList.remove('d-none');
    }
});

// =====================================================================
// 📦 2. CONSUMO DEL CATALOGO (MICROSERVICIO REST)
// =====================================================================
async function cargarProductosREST() {
    const tbody = document.getElementById('productos-table-body');
    try {
        // 1. Apuntamos a la ruta exacta con el prefijo interno de tu APIRouter
        // NOTA: Como tu endpoint GET no tiene Depends(verificar_token_jwt), no necesita headers de Authorization
        const response = await fetch(`${API_BASE}/rest/api/v1/rest/productos`);
        
        if (!response.ok) throw new Error("No se pudieron leer los productos de la API REST");
        const productos = await response.json();
        
        console.log("Datos reales recibidos de REST:", productos); 
        
        tbody.innerHTML = "";
        
        if (productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay productos registrados en la base de datos de la Cerería.</td></tr>`;
            return;
        }

        productos.forEach(p => {
            // 2. Mapeamos exactamente las llaves que definiste en tu ProductoResponseSchema de Pydantic
            const id = p.ID_producto;
            const nombre = p.nombre_producto;
            const desc = p.categoria || "General"; // Usamos la categoría como descripción en la tabla
            const costo = parseFloat(p.costo_unitario || 0).toFixed(2);

            tbody.innerHTML += `
                <tr>
                    <td><strong>${id}</strong></td>
                    <td>${nombre}</td>
                    <td><span class="badge bg-secondary">${desc}</span></td>
                    <td><span class="badge bg-primary">Q${costo}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error en CRUD REST:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error al conectar con /rest/api/v1/rest/productos. Revisa la consola con F12.</td></tr>`;
    }
}
// =====================================================================
// 🟣 3. OPERACIONES REALES CON GRAPHQL (STRAWBERRY APP)
// =====================================================================

// AUXILIAR: Función centralizada para enviar peticiones a GraphQL
async function enviarGraphQL(queryObjeto) {
    const response = await fetch(`${API_BASE}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`
        },
        body: JSON.stringify(queryObjeto)
    });
    return await response.json();
}

// --- QUERY 1: ALERTAS DE STOCK BAJO ---
document.getElementById('btn-alertas-stock').addEventListener('click', async () => {
    const resultBox = document.getElementById('graphql-result');
    resultBox.className = "text-warning m-0 small fw-bold";
    resultBox.innerText = "Consultando vista_alertas_stock_bajo...";

    const cuerpo = {
        query: `
            query {
                alertasStockBajo {
                    nombreSucursal
                    nombreProducto
                    categoria
                    stockActual
                }
            }
        `
    };

    try {
        const res = await enviarGraphQL(cuerpo);
        if (res.errors) throw new Error(JSON.stringify(res.errors));
        
        const alertas = res.data.alertasStockBajo;
        if (alertas.length === 0) {
            resultBox.innerText = "✅ Todo nítido: No hay productos con stock bajo en ninguna sucursal.";
            return;
        }

        let lista = "⚠️ ALERTAS DE STOCK CRÍTICO:\n\n";
        alertas.forEach(a => {
            lista += `• [${a.nombreSucursal}] ${a.nombreProducto} (${a.categoria}) -> Stock: ${a.stockActual} unidades.\n`;
        });
        resultBox.innerText = lista;
    } catch (err) {
        resultBox.className = "text-danger m-0 small fw-bold";
        resultBox.innerText = `Error GraphQL:\n${err.message}`;
    }
});

// --- QUERY 2: VALOR TOTAL DEL INVENTARIO POR SUCURSAL ---
document.getElementById('btn-valor-inventario').addEventListener('click', async () => {
    const resultBox = document.getElementById('graphql-result');
    resultBox.className = "text-info m-0 small fw-bold";
    resultBox.innerText = "Calculando agregaciones monetarias en MySQL...";

    const cuerpo = {
        query: `
            query {
                valorInventarioPorSucursal {
                    nombreSucursal
                    totalUnidades
                    valorMonetarioTotal
                }
            }
        `
    };

    try {
        const res = await enviarGraphQL(cuerpo);
        if (res.errors) throw new Error(JSON.stringify(res.errors));

        const inventarios = res.data.valorInventarioPorSucursal;
        let reporte = "💰 AUDITORÍA FINANCIERA DE INVENTARIO:\n\n";
        inventarios.forEach(i => {
            reporte += `🏢 Sucursal: ${i.nombreSucursal}\n   • Volumen Total: ${i.totalUnidades} velas\n   • Valor Monetario: Q${parseFloat(i.valorMonetarioTotal).toFixed(2)}\n\n`;
        });
        resultBox.innerText = reporte;
    } catch (err) {
        resultBox.className = "text-danger m-0 small fw-bold";
        resultBox.innerText = `Error GraphQL:\n${err.message}`;
    }
});

// --- MUTATION 1: ACTUALIZAR COSTO DE UN PRODUCTO ---
document.getElementById('graphql-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('product-id').value);
    const costo = parseFloat(document.getElementById('new-cost').value);
    const resultBox = document.getElementById('graphql-result');

    const cuerpo = {
        query: `
            mutation {
                actualizarCostoProducto(idProducto: ${id}, nuevoCosto: ${costo}) {
                    success
                    message
                }
            }
        `
    };

    try {
        const res = await enviarGraphQL(cuerpo);
        if (res.errors) throw new Error(JSON.stringify(res.errors));

        const mutRes = res.data.actualizarCostoProducto;
        resultBox.className = mutRes.success ? "text-success m-0 small fw-bold" : "text-danger m-0 small fw-bold";
        resultBox.innerText = `Status: ${mutRes.success ? 'ÉXITO' : 'RECHAZADO'}\n\n${mutRes.message}`;
        
        // Refrescamos automáticamente la lista REST de la pestaña 1
        cargarProductosREST();
    } catch (err) {
        resultBox.className = "text-danger m-0 small fw-bold";
        resultBox.innerText = `Error Crítico:\n${err.message}`;
    }
});

// --- MUTATION 2: REGISTRAR MOVIMIENTO KARDEX (LLAMADA AL SP) ---
document.getElementById('graphql-kardex-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idProd = parseInt(document.getElementById('kardex-prod-id').value);
    const idSuc = parseInt(document.getElementById('kardex-suc-id').value);
    const idUser = parseInt(document.getElementById('kardex-user-id').value);
    const tipo = document.getElementById('kardex-tipo').value;
    const cantidad = parseInt(document.getElementById('kardex-cant').value);
    const resultBox = document.getElementById('graphql-result');

    const cuerpo = {
        query: `
            mutation {
                registrarMovimientoKardex(
                    idProducto: ${idProd},
                    idSucursal: ${idSuc},
                    idUsuario: ${idUser},
                    tipoMovimiento: "${tipo}",
                    cantidad: ${cantidad}
                ) {
                    success
                    message
                }
            }
        `
    };

    try {
        const res = await enviarGraphQL(cuerpo);
        if (res.errors) throw new Error(JSON.stringify(res.errors));

        const mutRes = res.data.registrarMovimientoKardex;
        resultBox.className = mutRes.success ? "text-success m-0 small fw-bold" : "text-danger m-0 small fw-bold";
        resultBox.innerText = `⚙️ Stored Procedure Log:\n\nStatus: ${mutRes.success ? 'ÉXITO' : 'RECHAZADO'}\nFeedback: ${mutRes.message}`;
    } catch (err) {
        resultBox.className = "text-danger m-0 small fw-bold";
        resultBox.innerText = `Error Crítico de Kardex:\n${err.message}`;
    }
});