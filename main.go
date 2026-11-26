package main

import (
"crypto/sha1"
"encoding/base64"
"encoding/binary"
"fmt"
"helix-galrd/nanopixel"
"io"
"net"
"net/http"
"os"
"strconv"
"strings"
"sync"
"time"
)

const guiaWebSocket = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

type ControlFisico struct {
sync.Mutex
FrecuenciaHz      float64
AmplitudSonora    float64
ElasticidadCauchy float64
ViscosidadNemesis float64
ImpactoMovimiento float64
}

var control = &ControlFisico{
FrecuenciaHz:      110.0,
AmplitudSonora:    450.0,
ElasticidadCauchy: 180.0,
ViscosidadNemesis: 4.5,
}

func manejarWebSocket(w http.ResponseWriter, r *http.Request) {
clave := r.Header.Get("Sec-WebSocket-Key")
if clave == "" {
http.Error(w, "Se requiere cabecera WebSocket", 400)
return
}
hash := sha1.New()
hash.Write([]byte(clave + guiaWebSocket))
aceptacion := base64.StdEncoding.EncodeToString(hash.Sum(nil))

secuestrador, ok := w.(http.Hijacker)
if !ok {
return
}
conexion, bufer, err := secuestrador.Hijack()
if err != nil {
return
}
defer conexion.Close()

bufer.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + aceptacion + "\r\n\r\n")
bufer.Flush()

go escucharComandosCliente(conexion)

malla := nanopixel.NuevaMallaBioPixeles(64, 40)
fotograma := make([]byte, 64*40*6)
reloj := time.NewTicker(16 * time.Millisecond)
defer reloj.Stop()

tiempo := 0.0
for range reloj.C {
control.Lock()
malla.Elasticidad = control.ElasticidadCauchy
malla.Viscosidad = control.ViscosidadNemesis
freq := control.FrecuenciaHz
amp := control.AmplitudSonora
imp := control.ImpactoMovimiento
control.ImpactoMovimiento *= 0.82
control.Unlock()

malla.PasoSimulacion(tiempo, 0.016, freq, amp, imp)
malla.RenderizarBuffer(fotograma)
tiempo += 0.016

largo := uint16(len(fotograma))
cabecera := append([]byte{0x82, 126}, byte(largo>>8), byte(largo))
if _, err := conexion.Write(cabecera); err != nil {
return
}
if _, err := conexion.Write(fotograma); err != nil {
return
}
}
}

func escucharComandosCliente(conexion net.Conn) {
for {
var byte0, byte1 byte
if err := binary.Read(conexion, binary.BigEndian, &byte0); err != nil {
return
}
if err := binary.Read(conexion, binary.BigEndian, &byte1); err != nil {
return
}
if (byte0 & 0x0F) == 0x8 {
return
}
largo := int(byte1 & 0x7F)
if largo == 126 {
var largoExt uint16
if err := binary.Read(conexion, binary.BigEndian, &largoExt); err != nil {
return
}
largo = int(largoExt)
}
mascara := make([]byte, 4)
if (byte1 & 0x80) != 0 {
if _, err := io.ReadFull(conexion, mascara); err != nil {
return
}
}
datos := make([]byte, largo)
if _, err := io.ReadFull(conexion, datos); err != nil {
return
}
if (byte1 & 0x80) != 0 {
for i := 0; i < largo; i++ {
datos[i] ^= mascara[i%4]
}
}

control.Lock()
for _, parte := range strings.Split(string(datos), "|") {
clave, valorTxt, encontrado := strings.Cut(parte, ":")
if encontrado {
if valor, err := strconv.ParseFloat(valorTxt, 64); err == nil {
switch clave {
case "F":
control.FrecuenciaHz = valor
case "A":
control.AmplitudSonora = valor
case "E":
control.ElasticidadCauchy = valor
case "V":
control.ViscosidadNemesis = valor
case "P":
control.ImpactoMovimiento = valor
}
}
}
}
control.Unlock()
}
}

func main() {
http.Handle("/", http.FileServer(http.Dir(".")))
http.HandleFunc("/ws", manejarWebSocket)
http.HandleFunc("/api/save", func(w http.ResponseWriter, r *http.Request) {
cuerpo, _ := io.ReadAll(r.Body)
_ = os.WriteFile("proyecto.hlx", cuerpo, 0644)
})
fmt.Println("Motor Cuantico y Viscoelastico HELIX activo en puerto :8090")
_ = http.ListenAndServe(":8090", nil)
}
