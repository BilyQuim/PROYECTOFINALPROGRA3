import pytest

@pytest.fixture
def base_url():
    return "http://localhost"

@pytest.fixture
def usuario_valido():
    return {
        "nombre_usuario": "carlos_encargado1",
        "contraseña": "123456"
    }

@pytest.fixture
def producto_ejemplo():
    return {
        "idProducto": 1,
        "nuevoCosto": 14.70
    }