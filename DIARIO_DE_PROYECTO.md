# 📓 Diario de Proyecto · Scout AI
> **Hackathon AWS 2026** · Inteligencia Táctica para el Mercado de Fichajes de Fútbol  
> *Registro cronológico detallado de requerimientos, decisiones arquitectónicas, incidencias y soluciones implementadas.*

---

## 📋 Resumen Ejecutivo del Proyecto

**Scout AI** es una plataforma de scouting inteligente para directores deportivos y secretarías técnicas de clubes de fútbol. Permite buscar jugadores usando descripciones en lenguaje natural (ej. *"Centrocampista 'box-to-box' con llegada, similar a Rodri, con buena salida de balón"*). 

La aplicación convierte la búsqueda en un vector semántico mediante **Amazon Bedrock (Titan Text Embeddings v2)** y calcula la similitud de coseno contra una base de datos vectorial de más de 1.600 futbolistas procesados, devolviendo los mejores candidatos de forma instantánea.

---

## ⏱️ Cronología de Desarrollo y Registro de Cambios

### 🔹 Fase 1: Ingeniería de Datos y Normalización de Estadísticas
* **Petición del usuario:**
  > *"Tengo un script en Python llamado `process_players.py` que debe leer un archivo CSV de jugadores, pero me está devolviendo '0 jugadores' debido a un desajuste en los nombres de las columnas o el formato. Reescríbelo con pandas, detectando separadores, filtrando por al menos 10 partidos jugados y generando una columna `text_profile` en español."*
* **Problema identificado:**
  - El CSV original (`jugadores_stats.csv`) presentaba delimitadores variables, nombres de columnas abreviados (`MP`, `Min`, `Gls`, `Ast`, `PrgP`, `TklW`, etc.) y codificaciones complejas.
* **Solución implementada:**
  - Se implementó un algoritmo de autodetección de separador (coma, punto y coma, tabulador) mediante `csv.Sniffer`.
  - Filtro estricto por partidos jugados (`MP >= 10`).
  - Generador automatizado de narrativa deportiva (`text_profile`) en español:
    - Posición (`FW`, `MF`, `DF`, `GK`).
    - Edad, nacionalidad, equipo y liga de procedencia.
    - Minutaje, goles, asistencias, disparos a puerta y precisión.
    - Métricas defensivas: entradas ganadas, intercepciones y tarjetas.
    - Métricas específicas para guardametas (paradas, porcentaje de paradas y porterías a cero).
  - Exportación en formato JSON (`perfiles_procesados.json`) con 1.677 perfiles validados.

---

### 🔹 Fase 2: Generación de Embeddings Vectoriales con Amazon Bedrock
* **Petición del usuario:**
  > *"Escribe un script en Python llamado `generar_vectores.py` que use `boto3` para conectarse a Amazon Bedrock y generar los embeddings de la columna `text_profile` usando el modelo `amazon.titan-embed-text-v2:0` en la región `us-east-1`."*
* **Decisiones técnicas:**
  - Configuración del cliente `boto3.client('bedrock-runtime', region_name='us-east-1')`.
  - Estructuración del payload de invocación para Titan Text v2:
    ```json
    {
      "inputText": "<text_profile>",
      "dimensions": 1024,
      "normalize": true
    }
    ```
  - Manejo de cuotas y *rate limits* con reintentos exponenciales y retardos controlados.
  - Almacenamiento de salida en `perfiles_con_vectores.json` incorporando el vector embedding de dimensión 1024 a cada registro.

---

### 🔹 Fase 3: Internacionalización y Estandarización a Inglés
* **Petición del usuario:**
  > *"Reestructura todo para que sea en inglés en vez de en español."*
* **Acciones realizadas:**
  - Creación y adaptación de `process_players.py` para generar descripciones tácticas en inglés nativo (ej. *"Rodri is a 30-year-old midfielder from ESP playing for Barcelona in La Liga..."*).
  - Creación del script `generate_vectors.py` con nomenclatura estándar en inglés.
  - Soporte de expresiones bilingües en el frontend para procesar perfiles históricos tanto en inglés como en español sin romper métricas.

---

### 🔹 Fase 4: Integración del Frontend Next.js con AWS Lambda Real
* **Petición del usuario:**
  > *"Mi aplicación actualmente usa datos falsos (mocks). Quiero conectar el buscador a mi backend real en AWS: `https://5uvzdtgkjlj236p37w44jykzju0dsrqz.lambda-url.us-east-1.on.aws/`. Al enviar una búsqueda, hacer POST enviando `{"query": "texto de búsqueda"}` y pintar el top 5 real."*
* **Problema encontrado (Error CORS del navegador):**
  - La URL de la función Lambda no tenía configurados los encabezados `Access-Control-Allow-Origin` para peticiones `OPTIONS` (preflight) desde `localhost:3000`, provocando un fallo silencioso `TypeError: Failed to fetch` en el navegador del cliente.
* **Solución arquitectónica (API Route Proxy):**
  - Se creó una ruta de backend interna en Next.js: `app/api/search/route.ts`.
  - El frontend ahora realiza `fetch('/api/search')`. El servidor de Next.js ejecuta la llamada HTTP hacia la Lambda en AWS Server-to-Server, eliminando al 100% cualquier restricción o bloqueo de CORS del navegador.

---

### 🔹 Fase 5: Optimización de Rendimiento en AWS Lambda
* **Problema identificado:**
  - Las primeras peticiones a la Lambda arrojaban un error `504 Gateway Timeout`.
  - La función Lambda `scout-ai-backend` tenía una configuración por defecto de **3 segundos de timeout** y memoria reducida. Debido al arranque en frío (*cold start*), la inicialización de boto3 y la carga de 1.677 vectores en memoria superaba los 3 segundos.
* **Solución aplicada:**
  - Se incrementó el **timeout a 30 segundos** y la memoria RAM a **512 MB**.
  - El tiempo de respuesta efectivo pasó a ser de **~1,5 a 1,8 segundos**, logrando una respuesta fluida para el usuario final.

---

### 🔹 Fase 6: Resolución de Conflictos de Git y Error de Compilación (`Build Error`)
* **Incidencia:**
  - El usuario ejecutó `git merge feat/interfaz`, lo que ocasionó un conflicto de fusión en `app/page.tsx`.
  - Al resolverse parcialmente, quedó un bloque `setTimeout` / `try-catch` mal anidado (`Build Error: Expected ',', got 'catch' at app/page.tsx:418`), impidiendo que Next.js Turbopack arrancara.
* **Solución aplicada:**
  - Se reescribió `app/page.tsx` de forma limpia y tipada, eliminando bloques rotos.
  - Se ejecutó `npm run build`, logrando compilar con éxito en **2.4 segundos** y pasando todos los chequeos de TypeScript.

---

### 🔹 Fase 7: Rediseño Visual, Sistema de Banderas CDN y Efectos Hover
* **Petición del usuario:**
  > *"Rediseña un poco la interfaz, haz que salgan bien las banderas de los jugadores y que las tarjetas cuando paso el raton por encima de un jugador se encienda (ilumine el borde) en vez de parpadear."*
* **1. Solución para las banderas (Flagcdn):**
  - En sistemas Windows, los emojis de banderas (`🇪🇸`, `🇭🇷`, `🇫🇷`) no se renderizan como iconos de colores, sino como letras de países en blanco y negro o caracteres rotos (`[E][S]`).
  - Se implementó un mapeo exhaustivo con los **98 códigos de países** del dataset hacia la CDN de banderas vectoriales de alta definición **Flagcdn** (`https://flagcdn.com/w80/{iso2}.png`).
  - Ahora cada jugador muestra su bandera oficial, nítida y perfectamente alineada tanto en el avatar principal como en la etiqueta de nacionalidad.
* **2. Corrección del parpadeo en las tarjetas (Hover Glow):**
  - Anteriormente, la clase CSS ejecutaba una animación infinita de fotogramas clave `@keyframes pulse-glow` que provocaba un titileo continuo al interactuar con la tarjeta.
  - Se sustituyó en `app/globals.css` por una transición suave y estática:
    - Borde iluminado en esmeralda: `border-color: rgba(16, 185, 129, 0.75)`.
    - Resplandor exterior: `box-shadow: 0 0 28px -2px rgba(16, 185, 129, 0.35)`.
    - Elevación sutil en el eje Y: `transform: translateY(-4px)`.
* **3. Rediseño general de la interfaz:**
  - Estética oscura táctica (*Dark Tactical Intelligence*).
  - Encabezado con estado en vivo del servicio Bedrock.
  - Barra de búsqueda con sugerencias rápidas en un clic (*Quick Prompts*).
  - Anillo de porcentaje de compatibilidad táctica (*Match Ring*).
  - Barras de progreso dinámicas para estadísticas clave extraídas automáticamente del informe IA.

---

## 🛠️ Stack Tecnológico Utilizado

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 + React 19 + TypeScript | Interfaz de usuario interactiva y Server Components |
| **Estilos** | Tailwind CSS v4 + Vanilla CSS Custom Tokens | Diseño responsivo, efectos de brillo y paleta esmeralda/tactical |
| **Iconografía** | Lucide React | Iconos tácticos y de navegación |
| **Banderas** | Flagcdn (PNG w80 / SVG) | Renderizado consistente de banderas internacionales en todos los sistemas operativos |
| **API Proxy** | Next.js API Routes (`/api/search`) | Pasarela segura hacia AWS Lambda sin problemas de CORS |
| **Backend Serveless** | AWS Lambda (Python 3.12) | Recepción de consultas, cálculo de similitud y ranking |
| **IA & Embeddings** | Amazon Bedrock (`titan-embed-text-v2:0`) | Generación de vectores semánticos de 1024 dimensiones |
| **Ingeniería de Datos** | Python + Pandas + Boto3 | Normalización de datos CSV y generación de perfiles vectorizados |

---

## ✅ Estado Actual
- **Compilación:** `npm run build` pasa limpiamente (0 errores, 0 warnings de tipos).
- **Servidor:** Activo en `http://localhost:3000`.
- **Integración:** Conexión en vivo con Amazon Bedrock y AWS Lambda.
- **Git:** Todos los cambios consolidados en la rama `main`.
