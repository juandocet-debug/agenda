path = 'frontend/src/presentacion/screens/AgendarPublicoScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# BUG: toISOString() usa UTC, desplaza la fecha un día en zonas UTC-X.
# FIX: usar la fecha local con padding manual para obtener "YYYY-MM-DD" local.

old = "      const dateString = d.toISOString().split('T')[0];"
new = (
    "      // FIX: formatear con hora LOCAL para evitar desfase por zona horaria (bug UTC)\n"
    "      const yyyy = d.getFullYear();\n"
    "      const mm = String(d.getMonth() + 1).padStart(2, '0');\n"
    "      const dd = String(d.getDate()).padStart(2, '0');\n"
    "      const dateString = `${yyyy}-${mm}-${dd}`;"
)

if old in c:
    c2 = c.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c2)
    print('OK - timezone fix applied')
else:
    print('NOT FOUND')
    idx = c.find('toISOString')
    print(repr(c[max(0,idx-80):idx+80]))
