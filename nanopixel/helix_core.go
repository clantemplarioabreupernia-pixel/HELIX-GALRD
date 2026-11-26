package nanopixel

import "math"

const (
h    = 6.62607015e-34
c    = 2.99792458e8
e    = 1.60217663e-19
m0   = 9.1093837e-31
eps0 = 8.85418781e-12
)

const (
CaraArriba    = 0
CaraAbajo     = 1
CaraDerecha   = 2
CaraIzquierda = 3
CaraFrente    = 4
CaraFondo     = 5
)

type BioPixelCubico struct {
BitsPolaridad  uint8
Caras          [6]float64
Desplazamiento [3]float64
Velocidad      [3]float64
Aceleracion    [3]float64
RadioR, RadioG, RadioB float64
}

type MallaBioPixeles struct {
Ancho, Alto int
Celdas      []BioPixelCubico
Densidad    float64
Elasticidad float64
Viscosidad  float64
Vds         float64
}

func NuevaMallaBioPixeles(ancho, alto int) *MallaBioPixeles {
celdas := make([]BioPixelCubico, ancho*alto)
for y := 0; y < alto; y++ {
for x := 0; x < ancho; x++ {
idx := y*ancho + x
bits := uint8(((x % 2) << 0) | ((y % 2) << 1) | (((x + y) % 2) << 2))
celdas[idx] = BioPixelCubico{
BitsPolaridad: bits,
RadioR:        3.35,
RadioG:        2.29,
RadioB:        1.88,
}
celdas[idx].sincronizarCaras()
}
}
return &MallaBioPixeles{
Ancho:       ancho,
Alto:        alto,
Celdas:      celdas,
Densidad:    1050.0,
Elasticidad: 180.0,
Viscosidad:  4.5,
Vds:         5.0,
}
}

func (bp *BioPixelCubico) sincronizarCaras() {
sx, sy, sz := 1.0, 1.0, 1.0
if (bp.BitsPolaridad & 0x01) != 0 { sx = -1.0 }
if (bp.BitsPolaridad & 0x02) != 0 { sy = -1.0 }
if (bp.BitsPolaridad & 0x04) != 0 { sz = -1.0 }

bp.Caras[CaraDerecha] = bp.Desplazamiento[0] * sx
bp.Caras[CaraIzquierda] = -bp.Caras[CaraDerecha]

bp.Caras[CaraArriba] = bp.Desplazamiento[1] * sy
bp.Caras[CaraAbajo] = -bp.Caras[CaraArriba]

bp.Caras[CaraFrente] = bp.Desplazamiento[2] * sz
bp.Caras[CaraFondo] = -bp.Caras[CaraFrente]
}

func (m *MallaBioPixeles) PasoSimulacion(t, dt, freqHz, amplitud, impactoPaso float64) {
omega := 2.0 * math.Pi * freqHz
cx, cy := float64(m.Ancho)/2.0, float64(m.Alto)/2.0

for y := 1; y < m.Alto-1; y++ {
for x := 1; x < m.Ancho-1; x++ {
idx := y*m.Ancho + x
celda := &m.Celdas[idx]

idxArriba := (y-1)*m.Ancho + x
idxAbajo := (y+1)*m.Ancho + x
idxIzq := y*m.Ancho + (x - 1)
idxDer := y*m.Ancho + (x + 1)

dist := math.Hypot(float64(x)-cx, float64(y)-cy)
ondaSonora := amplitud * math.Sin(omega*t-dist*0.42) * math.Exp(-dist*0.035)
ondaPaso := impactoPaso * math.Cos(dist*0.6-t*12.0) * math.Exp(-dist*0.06)

for eje := 0; eje < 3; eje++ {
lapU := m.Celdas[idxArriba].Desplazamiento[eje] +
m.Celdas[idxAbajo].Desplazamiento[eje] +
m.Celdas[idxIzq].Desplazamiento[eje] +
m.Celdas[idxDer].Desplazamiento[eje] -
4.0*celda.Desplazamiento[eje]

lapV := m.Celdas[idxArriba].Velocidad[eje] +
m.Celdas[idxAbajo].Velocidad[eje] +
m.Celdas[idxIzq].Velocidad[eje] +
m.Celdas[idxDer].Velocidad[eje] -
4.0*celda.Velocidad[eje]

esfuerzo := m.Elasticidad*lapU - 12.0*celda.Desplazamiento[eje] + m.Viscosidad*lapV

fuerzaExt := ondaSonora
if eje == 1 {
fuerzaExt += ondaPaso
}

celda.Aceleracion[eje] = (esfuerzo + fuerzaExt) / m.Densidad
}
}
}

for i := range m.Celdas {
for eje := 0; eje < 3; eje++ {
m.Celdas[i].Velocidad[eje] = (m.Celdas[i].Velocidad[eje] + m.Celdas[i].Aceleracion[eje]*dt) * 0.985
m.Celdas[i].Desplazamiento[eje] += m.Celdas[i].Velocidad[eje] * dt
}
m.Celdas[i].sincronizarCaras()
}
}

func (m *MallaBioPixeles) RenderizarBuffer(buf []byte) {
const iMax = 195.0

for i := range m.Celdas {
bp := &m.Celdas[i]

energiaY := math.Abs(bp.Caras[CaraArriba]-bp.Caras[CaraAbajo]) * 0.5
profundidadZ := math.Tanh((bp.Caras[CaraFrente] - bp.Caras[CaraFondo]) * 8.0)
energiaX := math.Tanh((bp.Caras[CaraDerecha] - bp.Caras[CaraIzquierda]) * 8.0)

factorR := 1.0 - 0.16*profundidadZ
factorG := 1.0 - 0.14*energiaX
factorB := 1.0 + 0.16*profundidadZ

lamR := calcularBrusCdSe(bp.RadioR * factorR)
lamG := calcularBrusCdSe(bp.RadioG * factorG)
lamB := calcularBrusCdSe(bp.RadioB * factorB)

vgs := math.Min(1.6+energiaY*18.0, 4.5)
intensidad := math.Min(corrienteTFT(vgs, m.Vds)/iMax, 1.0)

r1, g1, b1 := espectroCIE(lamR, intensidad)
r2, g2, b2 := espectroCIE(lamG, intensidad)
r3, g3, b3 := espectroCIE(lamB, intensidad)

offset := i * 6
buf[offset+0] = gammaByte(r1 + r2 + r3)
buf[offset+1] = gammaByte(g1 + g2 + g3)
buf[offset+2] = gammaByte(b1 + b2 + b3)
buf[offset+3] = 255

alturaNorm := math.Max(0.0, math.Min(1.0, 0.5+bp.Desplazamiento[1]*2.5))
buf[offset+4] = uint8(alturaNorm * 255.0)
buf[offset+5] = bp.BitsPolaridad
}
}

func calcularBrusCdSe(radioNm float64) float64 {
if radioNm < 1.35 { radioNm = 1.35 }
egJ, meKg, mhKg, epsR := 1.74*e, 0.13*m0, 0.45*m0, 9.3
rM := radioNm * 1e-9
conf := (h * h / (8.0 * rM * rM)) * (1.0/meKg + 1.0/mhKg)
coul := (1.8 * e * e) / (4.0 * math.Pi * eps0 * epsR * rM)
return ((h * c) / (egJ + conf - coul)) * 1e9
}

func corrienteTFT(vgs, vds float64) float64 {
const mu, epsOx, tOx, wL, vth, lambdaC = 15e-4, 3.9, 10e-9, 5.0, 0.8, 0.02
if vgs <= vth { return 0.0 }
cox := (eps0 * epsOx) / tOx
if vds < (vgs - vth) {
return (mu * cox * wL * ((vgs-vth)*vds - 0.5*vds*vds)) * 1e6
}
diff := vgs - vth
return (0.5 * mu * cox * wL * diff * diff * (1.0 + lambdaC*vds)) * 1e6
}

func espectroCIE(lambda, intensidad float64) (float64, float64, float64) {
g := func(x, mu, t1, t2 float64) float64 {
t := t1
if x >= mu { t = t2 }
d := (x - mu) * t
return math.Exp(-0.5 * d * d)
}
X := 1.056*g(lambda, 599.8, 0.0264, 0.0323) + 0.362*g(lambda, 442.0, 0.0624, 0.0374) - 0.065*g(lambda, 501.1, 0.0490, 0.0382)
Y := 0.821*g(lambda, 568.8, 0.0213, 0.0247) + 0.286*g(lambda, 530.9, 0.0613, 0.0322)
Z := 1.217*g(lambda, 437.0, 0.0845, 0.0278) + 0.681*g(lambda, 459.0, 0.0385, 0.0725)

return (3.2406*X - 1.5372*Y - 0.4986*Z) * intensidad,
(-0.9689*X + 1.8758*Y + 0.0415*Z) * intensidad,
(0.0557*X - 0.2040*Y + 1.0570*Z) * intensidad
}

func gammaByte(v float64) uint8 {
if v <= 0 { return 0 }
if v <= 0.0031308 { v = 12.92 * v } else { v = 1.055*math.Pow(v, 1.0/2.4) - 0.055 }
if v > 1.0 { v = 1.0 }
return uint8(math.Round(v * 255.0))
}
