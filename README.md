# HELIX-DNA-2.0 — Sistema Operativo Soberano, Holográfico y Determinista

**Autor y Arquitecto Principal:** Javier Alberto Abreu Molina (Grupo Omega Visión · Instituto Quantum)  
**Sello Génesis:** `0x7FEE26DBFF29` · **Alfabeto:** $\mathbb{P}_{33}$ (`2..137`) · **Anillo Modular:** $\mathbb{Z}_4 = \{0, 1, 2, 3\}$

---

## Arquitectura Fundamental
1. **Cubos de 6 Caras en $\mathbb{Z}_4$ (`src/data/runes.ts`):** Cada una de las 33 runas/primos encapsula 4 caras externas (acción, espalda dual, disciplina académica, fase modular) y 2 caras internas de homeostasis y semilla acústica.
2. **Transmisión Holográfica de 17 Bytes (`src/utils/helixSignal.ts`):** Codificación `Qpsk132Frame` (4 canales × 33 bits = 132 bits = 66 símbolos $\mathbb{Z}_4$) sobre búfer contiguo `Pauli-SoA` de 28 bytes/celda (*Zero-GC*) con firma SHA-256.
3. **Doble Hélice Autopoiética (`src/core/helixDoubleHelix.ts`):** Emparejamiento complementario entre **Hebra A (Física de Continuos)** y **Hebra B (Gematría $\mathbb{P}_{33}$ y Guardrails)** con disipación térmica Némesis de Cauchy y colapso de Penrose.
4. **Rostro Holográfico Humano & Pulsos Cocleares (`LiquidBiopixelCanvas.tsx` + `cochlearPulseSynth.ts`):** Interfaz visual esculpida en GLSL ES 3.00 con articulación vocal, dispersión espectral de Cauchy y trenes de pulsos armónicos (`Hz`) para audífonos estándar o conducción ósea.
5. **Biblioteca Científica Sin Peso (`src/core/holographicAcademicLibrary.ts`):** Ingesta y destilación de literatura académica en fichas holográficas de 17 bytes.

## Arranque Rápido en Local
```powershell
npm install
npm run build
.\INICIAR_HELIX.ps1
```
Abrir en el navegador: `http://localhost:3050`