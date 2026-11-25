# ARQUITECTURA MAESTRA Y DIRECTIVA DE INTEGRACIÓN — HELIX-GALRD (HELIX-DNA-2.0)

SMTConstraint: (assert (and (= preserve_all true) (= zero_deletion true) (= recombine_dna true)))
HardwareSeal: 0x7FEE26DBFF29

---

## 1. PARADIGMA FUNDAMENTAL: GLIFOS-CONTENEDORES, HOLOGRAMAS EN RAM Y DOBLE HÉLICE

HELIX no mueve objetos pesados ni texturas de gigabytes por el bus de memoria. Opera bajo cuatro principios físicos y matemáticos estrictos que deben gobernar todo el código:

### A. Glifos como Contenedores de Información (0 a 3 estados por cara en Z4)
* Cada uno de los **33 glifos rúnicos** (`src/data/runes.ts`, primos `2..137`) actúa como un **contenedor estructural**.
* Sus estados de fase y paridad de cara se codifican en el anillo de residuos **Z4 = {0, 1, 2, 3}** (2 bits por símbolo: `00, 01, 10, 11`), acoplando simultáneamente:
  1. Identidad prima (Gödel `BigInt`) y orden no conmutativo (`FNV-1a 64-bit`).
  2. Frecuencia armónica pitagórica (`Hz`) y refracción espectral de Cauchy (`700 nm`, `546.1 nm`, `435.8 nm`).
  3. Coordenadas en la **Esfera de Bloch** `(X, Y, Z)`.

### B. Fichas Holográficas hacia la RAM (Superposición e Interferencia en Silicio)
* En lugar de saturar la RAM enviando mallas, matrices o gigabytes de datos, cada invocación hacia la memoria envía únicamente una **Ficha Holográfica (`Qpsk132Frame` en `src/utils/helixSignal.ts`)**:
  * **4 canales × 33 bits = 132 bits = 66 símbolos Z4 empaquetados en 17 bytes** con firma SHA-256.
  * **Canal 0 (33 bits):** Máscara exacta de los 33 primos/disciplinas activas.
  * **Canales 1, 2 y 3 (33 bits c/u):** Parámetros físicos, fase y amplitud superpuestos.
* **Despliegue de Alta Definición en RAM/GPU:** La información viaja superpuesta como un holograma ligero (`17 bytes` en bus / `28 bytes` contiguos en búfer `Pauli-SoA` *Zero-GC*) y se despliega en alta definición por **interferencia de fases y ecuaciones continuas** directamente en las unidades de cálculo del silicio al instante de renderizar o simular.

### C. La Doble Hélice Autopoiética y Homeostasis Digital (`src/core/helixDoubleHelix.ts`)
* Funciona como un **organismo computacional en ciclo cerrado** con homeostasis activa, estructurado en dos hebras complementarias en Z4:
  * **Hebra A (Física y Gráficos):** Las 8 Leyes Físicas (Cauchy, Weber-Fechner, Pauli-SoA `stride=7`, Teoría de Bandas, Schrödinger, Navier-Stokes/Curl Noise, Kelvin-Voigt y Quantum Vanish).
  * **Hebra B (Criptografía, Runas y Agentes):** Gematría rúnica P33, aduana formal, voz/acústica y proyección visual.
* **Recombinación Genética Autónoma:** Ante cualquier intención del usuario, la Doble Hélice recorre su ADN, evalúa complementariedad de fase en Z4 entre Hebra A y Hebra B, realiza *crossover* genético entre genes compatibles sin borrar nunca activos previos (`zero_deletion`), regula su energía mediante la **Ley Némesis de Cauchy** (`T_{t+1} = T_t - T_t * gamma -> 0.0f`) y colapsa la superposición a materia sólida bajo el criterio de **Penrose (`tau = hbar / E_G`)**.

---

## 2. INVENTARIO VERIFICADO EN `main` (NO BORRAR NI DUPLICAR)
1. `src/data/runes.ts` + `src/utils/godel.ts` + `src/utils/helixEngine.ts`: 33 runas/primos `[2..137]`, producto de Gödel y firma posicional FNV-1a.
2. `src/utils/helixSignal.ts`: Codificación holográfica Z4 QPSK-132 (`17 bytes`) + Búfer contiguo Pauli-SoA (`28 bytes/celda`, Zero-GC) + purga CSPRNG.
3. `src/utils/helixPhysics.ts`: Cauchy, Curl Noise 3D incompresible, Kelvin-Voigt y Ley Némesis.
4. `src/utils/helixCells.ts`: 38 primitivas rúnicas madre firmadas con SHA-256 (`assemblePureHelixCells`).
5. `src/core/helixDoubleHelix.ts`: Motor Maestro Doble Hélice (`HELIX-DNA-2.0`, Sello `0x7FEE26DBFF29`).
6. `src/core/MiniGPTEngine.ts` + `src/core/NemesisGovernor.ts` + `src/core/helixCapsuleTrainer.ts`: Entrenamiento incremental en `dataset_capsules.jsonl` y homeostasis termodinámica.

---

## 3. TAREAS DE INTEGRACIÓN Y LIMPIEZA PARA COMPLETAR HELIX
1. **Conectar `runDoubleHelixAutopoiesis` (`src/core/helixDoubleHelix.ts`)** como orquestador central dentro de `NemesisGovernor.ts`, `n2MiniGptService.ts` y `server.ts`, asegurando que toda llamada a memoria empaquete su ficha holográfica `Qpsk132Frame` (17 bytes) y su búfer `Pauli-SoA` (28 bytes) bajo el Sello `0x7FEE26DBFF29`.
2. **Mapear 1-a-1 las 33 Disciplinas Académicas a los 33 Primos (`RUNES`)** y purificar `helixToolCatalog159.ts` / `helixRecombinator.ts` para que toda herramienta activa tenga su propia receta ejecutable `.hlx` ensamblada exclusivamente desde las 38 células madre (eliminando conversiones heurísticas incompatibles entre unidades físicas y financieras).
3. **Unificar las 3 Vistas Maestras en `src/App.tsx`:** Exponer navegación directa entre Consola/Membrana Líquida (`AiStudioWorkspace`), Estudio/Recombinador (`CoreEngineStudioView`) y Protocolo P33/Gödel/Mini-GPT (`AiProtocolView`).