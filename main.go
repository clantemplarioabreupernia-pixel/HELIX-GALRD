package main
import ("fmt";"io";"net/http";"os")
func main() {
http.Handle("/", http.FileServer(http.Dir(".")))
http.HandleFunc("/api/save", func(w http.ResponseWriter, r *http.Request) {
b, _ := io.ReadAll(r.Body)
_ = os.WriteFile("proyecto.hlx", b, 0644)
})
fmt.Println("HELIX Studio en http://localhost:8080")
_ = http.ListenAndServe(":8080", nil)
}
