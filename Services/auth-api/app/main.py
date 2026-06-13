from fastapi import FastAPI
from routers import auth_router

app = FastAPI(
    title="Sistema de Autenticación - Cerería La Terminal",
    description="Microservicio indispensable encargado de validar credenciales y emitir tokens JWT seguros",
    version="1.0.0",
    docs_url="/docs",      
    redoc_url="/redoc"
)

app.include_router(auth_router.router)

@app.get("/", tags=["Raíz"])
def leer_raiz():
    return {
        "status": "Online",
        "servicio": "Autenticación (auth-api)",
        "mensaje": "Listo para emitir pases de acceso seguros hacia XAMPP"
    }