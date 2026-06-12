from fastapi import FastAPI
from routers import auth_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="API de Autenticación",
    root_path="/auth",             # <-- Cambiado a la ruta corta
    docs_url="/docs",              # <-- Esto hace que se abra en /auth/docs
    openapi_url="/openapi.json"
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cámbialo por tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)

@app.get("/", tags=["Raíz"])
def leer_raiz():
    return {
        "status": "Online",
        "servicio": "Autenticación (auth-api)",
        "mensaje": "Listo para emitir pases de acceso seguros hacia XAMPP"
    }