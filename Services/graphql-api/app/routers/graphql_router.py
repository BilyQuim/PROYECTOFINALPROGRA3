from fastapi import APIRouter
from strawberry.fastapi import GraphQLRouter
import strawberry
from typing import List
from sqlalchemy import text
from app.database.connection import get_db

# Tipos de datos para GraphQL 
@strawberry.type
class StockGraphQLType:
    IDStock: int
    IDSucursal: int
    IDProducto: int
    stockActual: int

@strawberry.type
class AlertaStockBajoType:
    nombre_sucursal: str
    nombre_producto: str
    categoria: str
    stock_actual: int

@strawberry.type
class ValorInventarioType:
    nombre_sucursal: str
    total_unidades: int
    valor_monetario_total: float

@strawberry.type
class MovimientoResponse:
    success: bool
    message: str

@strawberry.type
class CostoResponse:
    success: bool
    message: str

# Logica de consultas 

@strawberry.type
class Query:
    @strawberry.field
    def verExistencias(self) -> List[StockGraphQLType]:
        db = next(get_db())
        sql = text("SELECT ID_stock AS IDStock, ID_sucursal AS IDSucursal, ID_producto AS IDProducto, stock_actual AS stockActual FROM stock_actual")
        result = db.execute(sql).fetchall()
        return [StockGraphQLType(**row._mapping) for row in result]

    @strawberry.field
    def alertasStockBajo(self) -> List[AlertaStockBajoType]:
        db = next(get_db())
        sql = text("SELECT nombre_sucursal, nombre_producto, categoria, stock_actual FROM vista_alertas_stock_bajo")
        result = db.execute(sql).fetchall()
        return [AlertaStockBajoType(**row._mapping) for row in result]

    @strawberry.field
    def valorInventarioPorSucursal(self) -> List[ValorInventarioType]:
        db = next(get_db())
        sql = text("""
            SELECT s.nombre_sucursal, SUM(sa.stock_actual) AS total_unidades, SUM(sa.stock_actual * p.costo_unitario) AS valor_monetario_total
            FROM stock_actual sa JOIN sucursales s ON sa.ID_sucursal = s.ID_sucursal JOIN productos p ON sa.ID_producto = p.ID_producto
            GROUP BY s.ID_sucursal
        """)
        result = db.execute(sql).fetchall()
        return [ValorInventarioType(**row._mapping) for row in result]


# Alteraciones para mutaciones

@strawberry.type
class Mutation:
    @strawberry.mutation
    def registrarMovimientoKardex(self, id_producto: int, id_sucursal: int, id_usuario: int, tipo_movimiento: str, cantidad: int) -> MovimientoResponse:
        if tipo_movimiento not in ["ENTRADA", "SALIDA"]:
            return MovimientoResponse(success=False, message="El tipo de movimiento debe ser ENTRADA o SALIDA")
        db = next(get_db())
        try:
            sql = text("CALL sp_registrar_movimiento_kardex(:p_prod, :p_suc, :p_user, :p_tipo, :p_cant)")
            db.execute(sql, {"p_prod": id_producto, "p_suc": id_sucursal, "p_user": id_usuario, "p_tipo": tipo_movimiento, "p_cant": cantidad})
            db.commit()
            return MovimientoResponse(success=True, message=f"Movimiento de {tipo_movimiento} procesado con éxito")
        except Exception as e:
            db.rollback()
            return MovimientoResponse(success=False, message=f"Error interno: {str(e)}")

    @strawberry.mutation
    def actualizarCostoProducto(self, id_producto: int, nuevo_costo: float) -> CostoResponse:
        if nuevo_costo < 0:
            return CostoResponse(success=False, message="El costo no puede ser menor a 0")
        
        db = next(get_db())
        try:
            verificar = db.execute(text("SELECT ID_producto FROM productos WHERE ID_producto = :id"), {"id": id_producto}).fetchone()
            if not verificar:
                return CostoResponse(success=False, message=f"El producto con ID {id_producto} no existe en la base de datos")
            
            sql = text("UPDATE productos SET costo_unitario = :costo WHERE ID_producto = :id")
            db.execute(sql, {"costo": nuevo_costo, "id": id_producto})
            db.commit()
            return CostoResponse(success=True, message=f"Costo del producto {id_producto} actualizado exitosamente a Q{nuevo_costo:.2f}")
        except Exception as e:
            db.rollback()
            return CostoResponse(success=False, message=f"Error al actualizar en MySQL: {str(e)}")

# Configuración del router de GraphQL
schema = strawberry.Schema(query=Query, mutation=Mutation)
router = GraphQLRouter(schema)