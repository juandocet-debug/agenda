import os
import sys
import django

sys.path.append(r"c:\Users\SOPORTE\Documents\upn\Proyectos\Agenda\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import RequestFactory
from modulos.Profesionales.infraestructura.ProfesionalController import ListarProfesionalesController

rf = RequestFactory()
request = rf.get('/api/profesionales/lista/')

# We need to simulate an authenticated user because JWTAuthentication might fail or IsAuthenticated might block.
# Let's see if the view blows up just by being called, or if the error is inside the get method.

view = ListarProfesionalesController.as_view()
try:
    response = view(request)
    print("Status code:", response.status_code)
    print("Content:", response.content)
except Exception as e:
    import traceback
    traceback.print_exc()
