# ARQUITECTURA MAESTRA Y DIRECTIVA DE INTEGRACION — HELIX-GALRD (HELIX-DNA-2.0)

SMTConstraint: (assert (and (= preserve_all true) (= zero_deletion true) (= recombine_dna true)))
HardwareSeal: 0x7FEE26DBFF29

## NUCLEO VERIFICADO EN MAIN (NO BORRAR NI DUPLICAR)
1. `src/data/runes.ts` + `src/utils/godel.ts`: Alfabeto cerrado de 33 runas/primos [2..137] (base de las 33 disciplinas academicas), Producto de Godel BigInt y firma no conmutativa FNV-1a 64-bit.
2. `src/utils/helixSignal.ts`: Codificacion holografica Z4 = {0,1,2,3} QPSK-132 (4 canales x 33 bits = 17 bytes) + Bufer Pauli-SoA (28 bytes/celda, Zero-GC).
3. `src/utils/helixPhysics.ts`: Dispersion de Cauchy, Curl Noise 3D incompresible, Viscoelasticidad Kelvin-Voigt y Ley Nemesis de Cauchy.
4. `src/utils/helixCells.ts`: 38 celulas runicas madre firmadas con SHA-256 (`assemblePureHelixCells`).
5. `src/core/helixDoubleHelix.ts`: Motor Doble Helice (`HELIX-DNA-2.0`) con Sello `0x7FEE26DBFF29`, Hebra A (Fisica) <-> Hebra B (Simbolica P33) en Z4, Esfera de Bloch y colapso de Penrose.
6. `src/core/MiniGPTEngine.ts` + `src/core/NemesisGovernor.ts` + `src/core/helixCapsuleTrainer.ts`: Entrenamiento incremental sobre `dataset_capsules.jsonl` y homeostasis termodinamica.

## INTEGRACION FINAL PENDIENTE
1. Conectar `runDoubleHelixAutopoiesis` (`src/core/helixDoubleHelix.ts`) con `NemesisGovernor.ts`, `n2MiniGptService.ts` y `server.ts`.
2. Mapear 1-a-1 las 33 disciplinas academicas a los 33 primos de `RUNES` y purificar `helixToolCatalog159.ts` / `helixRecombinator.ts` para que toda herramienta tenga receta ejecutable `.hlx` construida solo con las 38 celulas madre (cero conversiones de unidades incompatibles).
3. Exponer en `src/App.tsx` las 3 vistas reales (`AiStudioWorkspace`, `CoreEngineStudioView`, `AiProtocolView`).