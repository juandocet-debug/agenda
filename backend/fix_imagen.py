path = r'C:\Users\SOPORTE\Documents\upn\Proyectos\Agenda\frontend\src\presentacion\screens\AgendarPublicoScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = "      precioBase: parseFloat(servicioSeleccionado.precio),\n    };"
new = "      precioBase: parseFloat(servicioSeleccionado.precio),\n      imagenUrl: servicioSeleccionado.imagen_url || undefined,\n    };"

if old in c:
    c2 = c.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c2)
    print('OK - imagenUrl added')
else:
    print('NOT FOUND - checking CRLF')
    old2 = old.replace('\n', '\r\n')
    if old2 in c:
        new2 = new.replace('\n', '\r\n')
        c2 = c.replace(old2, new2, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c2)
        print('OK - CRLF version fixed')
    else:
        print('REALLY NOT FOUND')
        # Find context
        idx = c.find('precioBase: parseFloat')
        print(repr(c[idx-5:idx+80]))
