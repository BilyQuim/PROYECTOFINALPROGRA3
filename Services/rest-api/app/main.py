from fastapi import FastAPI
from routers import producto_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="API REST de Productos",
    root_path="/rest",             # <-- Cambiado a la ruta corta
    docs_url="/docs",              # <-- Esto hace que se abra en /rest/docs
    openapi_url="/openapi.json"
)
app.include_router(producto_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite que cualquier frontend (incluyendo archivos locales) se conecte
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Raíz"])
def leer_raiz():
    return {
        "status": "Online",
        "proyecto": "Cerería La Terminal - Programación 3",
        "mensaje": "Microservicio REST conectado exitosamente a XAMPP"
    }