from rumbo import config, proveedores


def test_mensajes_claros():
    assert "clave no es válida" in proveedores.explicar("HTTP Error 401: Unauthorized")
    assert "modelo no existe" in proveedores.explicar("404 model not found")
    assert "Ollama" in proveedores.explicar("Connection refused localhost:11434")


def test_url_base_por_proveedor_y_configuraciones_antiguas():
    config.CONFIG.unlink(missing_ok=True)
    assert proveedores.base_url("openrouter") == "https://openrouter.ai/api/v1"
    config.guardar({"ia": {"proveedor": "openai", "base_url": "http://localhost:1234/v1"}})
    assert proveedores.base_url("openai") == "http://localhost:1234/v1"


def test_modelos_fijos_sin_red():
    assert any(m["id"] == "sonnet" for m in proveedores.modelos("claude-cli"))
