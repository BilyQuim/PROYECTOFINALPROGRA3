from fastapi import FastAPI
from app.routers import graphql_router

app = FastAPI(
    title="Sistema GraphQL API - Cerería La Terminal",
    description="Microservicio avanzado para consultas optimizadas y dinámicas de existencias (Stock Actual)",
    version="1.0.0"
)

app.include_router(graphql_router.router, prefix="/graphql")

@app.get("/", tags=["Raíz"])
def leer_raiz():
    return {
        "status": "Online",
        "servicio": "GraphQL (graphql-api)",
        "mensaje": "Servidor listo. Navega a /graphql para abrir el entorno de pruebas interactivo"
    }