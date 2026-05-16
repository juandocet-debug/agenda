path = 'frontend/src/presentacion/screens/AgendarPublicoScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = "minDate={new Date().toISOString().split('T')[0]}"
new = (
    "minDate={(() => {\n"
    "                const d = new Date();\n"
    "                const yyyy = d.getFullYear();\n"
    "                const mm = String(d.getMonth() + 1).padStart(2, '0');\n"
    "                const dd = String(d.getDate()).padStart(2, '0');\n"
    "                return `${yyyy}-${mm}-${dd}`;\n"
    "              })()}"
)

if old in c:
    c2 = c.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c2)
    print('OK - minDate timezone fix applied')
else:
    print('NOT FOUND')
