import os

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace aggressive font weights
                content = content.replace("fontWeight: 'bold'", "fontWeight: '500'")
                content = content.replace("fontWeight: '900'", "fontWeight: '500'")
                content = content.replace("fontWeight: '800'", "fontWeight: '500'")
                content = content.replace("fontWeight: '700'", "fontWeight: '500'")
                content = content.replace("fontWeight: '600'", "fontWeight: '500'")
                content = content.replace("fontWeight:\"bold\"", "fontWeight: '500'")
                content = content.replace('fontWeight: "bold"', "fontWeight: '500'")
                content = content.replace('fontWeight: "700"', "fontWeight: '500'")
                content = content.replace('fontWeight: "800"', "fontWeight: '500'")
                content = content.replace('fontWeight: "900"', "fontWeight: '500'")
                content = content.replace('fontWeight: "600"', "fontWeight: '500'")
                
                # Also remove PlusJakartaSans families
                content = content.replace("fontFamily: 'PlusJakartaSans_700Bold'", "fontWeight: '500'")
                content = content.replace("fontFamily: 'PlusJakartaSans_600SemiBold'", "fontWeight: '500'")
                content = content.replace("fontFamily: 'PlusJakartaSans_500Medium'", "fontWeight: '500'")
                content = content.replace("fontFamily: 'PlusJakartaSans_400Regular'", "")
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)

process_directory(r'C:\Users\SOPORTE\Documents\upn\Proyectos\Agenda\frontend\src')
print("Typography updated globally.")
