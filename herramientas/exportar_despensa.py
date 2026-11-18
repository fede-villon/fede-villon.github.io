"""Genera una versión navegable estática de Despensa para el portfolio.

Levanta la app real con los datos de ejemplo, recorre sus pantallas como
administrador y guarda cada una como HTML, con los links entre pantallas
reescritos. Los formularios quedan deshabilitados: es para mirar, no para guardar.

Uso (desde la carpeta del sitio):
  ../despensa/.venv/bin/python herramientas/exportar_despensa.py
"""
import re
import shutil
import sys
import tempfile
from pathlib import Path

SITIO = Path(__file__).resolve().parent.parent
DESPENSA = SITIO.parent / "despensa"
sys.path.insert(0, str(DESPENSA))

from app import create_app  # noqa: E402
from app.db import get_db, init_db  # noqa: E402
from app.seed import cargar_demo  # noqa: E402

DESTINO = SITIO / "demos" / "despensa"

PAGINAS = {
    "/": "index.html",
    "/ventas/caja": "caja.html",
    "/ventas/": "ventas.html",
    "/productos/": "productos.html",
    "/productos/1": "producto.html",
    "/productos/?filtro=bajo": "productos-bajo.html",
    "/compras/": "compras.html",
    "/compras/nueva?proveedor_id=1": "compra-nueva.html",
    "/reportes/": "reportes.html",
}

AVISO = """
<div style="background:#1c2128;color:#e9ecef;padding:10px 16px;font:14px system-ui;text-align:center">
  Versión navegable de <strong>Despensa</strong> con datos de ejemplo: se puede recorrer, pero no guarda cambios.
  La app completa (Python + Flask) está en
  <a style="color:#8ee3b8" href="https://github.com/fede-villon/despensa" target="_blank" rel="noopener">GitHub</a>.
</div>"""

SCRIPT = """
<script>
document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  alert('En esta versión de muestra no se guardan cambios. La app completa corre con Python: github.com/fede-villon/despensa');
}));
document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
</script>"""


def reescribir(html: str, ticket_ruta: str) -> str:
    rutas = dict(PAGINAS)
    rutas[ticket_ruta] = "ticket.html"

    def destino(url: str) -> str:
        if url.startswith(("http", "mailto:", "#", "estilo.css")):
            return url
        if url.startswith("/static/"):
            return url.rsplit("/", 1)[-1]
        if url in rutas:
            return rutas[url]
        base = url.split("?")[0]
        if base in rutas:
            return rutas[base]
        if re.fullmatch(r"/productos/\d+", base):
            return "producto.html"
        if re.fullmatch(r"/ventas/\d+", base):
            return "ticket.html"
        return "#"

    html = re.sub(r'(href|action)="([^"]*)"', lambda m: f'{m.group(1)}="{destino(m.group(2).replace("&amp;", "&"))}"', html)
    html = html.replace('<a href="#">Salir</a>', '<span style="opacity:.6">Salir</span>')
    html = html.replace("<body>", "<body>" + AVISO, 1)
    return html.replace("</body>", SCRIPT + "</body>")


def main():
    tmp = Path(tempfile.mkdtemp())
    app = create_app({"TESTING": True, "DATABASE": str(tmp / "demo.sqlite"), "SECRET_KEY": "demo"})
    with app.app_context():
        init_db()
        cargar_demo(get_db())
        ultima = get_db().execute("SELECT MAX(id) FROM ventas").fetchone()[0]
    c = app.test_client()
    c.post("/login", data={"usuario": "admin", "clave": "admin123"})
    # Un par de productos en la caja, para que la pantalla de venta se vea en uso
    c.post("/ventas/caja/agregar", data={"codigo": "7790002000010", "cantidad": 2})
    c.post("/ventas/caja/agregar", data={"codigo": "7790006000018", "cantidad": 3})

    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    DESTINO.mkdir(parents=True)
    shutil.copy(DESPENSA / "app" / "static" / "estilo.css", DESTINO / "estilo.css")
    ticket_ruta = f"/ventas/{ultima}"
    for ruta, archivo in {**PAGINAS, ticket_ruta: "ticket.html"}.items():
        r = c.get(ruta)
        assert r.status_code == 200, (ruta, r.status_code)
        (DESTINO / archivo).write_text(reescribir(r.get_data(as_text=True), ticket_ruta), encoding="utf-8")
    print(f"{len(PAGINAS) + 1} pantallas exportadas en {DESTINO}")


if __name__ == "__main__":
    main()
