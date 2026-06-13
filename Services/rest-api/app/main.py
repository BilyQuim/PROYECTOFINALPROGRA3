from fastapi import FastAPI
from routers import producto_router

app = FastAPI(
    title="Sistema REST API - Cerería La Terminal",
    description="Servicio indispensable para el CRUD optimizado del catálogo maestro de productos",
    version="1.0.0",
    docs_url="/docs",      
)

app.include_router(producto_router.router)

@app.get("/", tags=["Raíz"])
def leer_raiz():
    return {
        "status": "Online",
        "proyecto": "Cerería La Terminal - Programación 3",
        "mensaje": "Microservicio REST conectado exitosamente a XAMPP"
    }