"""Las pruebas nunca tocan tus datos reales: usan una carpeta temporal."""
import os
import tempfile

os.environ["RUMBO_HOME"] = tempfile.mkdtemp(prefix="rumbo-pruebas-")
