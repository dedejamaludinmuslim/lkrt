        var MY_SUPABASE_URL = 'https://rvlmszheenxbhehpzlne.supabase.co';
        var MY_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2bG1zemhlZW54YmhlaHB6bG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDIyNDEsImV4cCI6MjA4MTk3ODI0MX0.qqrPfESiAVG2CO4l-AgEPQqZ2ZNAV5WEZZN7MLLHitA';
        var supabase = window.supabase.createClient(MY_SUPABASE_URL, MY_SUPABASE_KEY);

        // --- 2. VARIABEL ---
        var views = { input: document.getElementById('viewInput'), harian: document.getElementById('viewHarian'), bulanan: document.getElementById('viewBulanan') };
        var tabs = { input: document.getElementById('tabInput'), harian: document.getElementById('tabHarian'), bulanan: document.getElementById('tabBulanan') };
        var loading = document.getElementById('loadingIndicator');

        // --- 3. NAVIGASI TAB UTAMA ---
        function pindahTab(namaTab) {
            // Sembunyikan semua view
            Object.values(views).forEach(el => el.classList.add('hidden'));
            
            // Reset style tombol navigasi (jadi abu-abu)
            Object.values(tabs).forEach(el => {
                el.className = "py-3 flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-500 transition border-t-2 border-transparent";
            });

            // Tampilkan view yang dipilih
            views[namaTab].classList.remove('hidden');
            
            // Highlight tombol aktif (jadi biru)
            tabs[namaTab].className = "py-3 flex flex-col items-center gap-1 text-indigo-600 transition border-t-2 border-indigo-600 bg-indigo-50/50";

            // Load Data sesuai tab
            if (namaTab === 'harian') fetchHarian();
            if (namaTab === 'bulanan') fetchBulanan();
            if (namaTab === 'input') fetchSuggestions();
        }

        // --- 4. LOGIC TANGGAL & BULAN (< >) ---
        function changeDate(offset) {
            const dateInput = document.getElementById('filterTanggal');
            if(!dateInput.value) dateInput.valueAsDate = new Date();
            
            const current = new Date(dateInput.value);
            current.setDate(current.getDate() + offset);
            
            // Format YYYY-MM-DD
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            dateInput.value = `${y}-${m}-${d}`;
            
            fetchHarian();
        }

        function changeMonth(offset) {
            const monthInput = document.getElementById('filterBulan');
            if(!monthInput.value) {
                const now = new Date();
                monthInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            }

            const parts = monthInput.value.split('-'); 
            let year = parseInt(parts[0]);
            let month = parseInt(parts[1]) - 1; 

            const d = new Date(year, month + offset, 1);
            
            const newY = d.getFullYear();
            const newM = String(d.getMonth() + 1).padStart(2, '0');
            monthInput.value = `${newY}-${newM}`;
            
            fetchBulanan();
        }

        // --- 5. FETCH DATA (SUPABASE) ---
        // A. Harian
        async function fetchHarian() {
            loading.classList.remove('hidden');
            var tgl = document.getElementById('filterTanggal').value;
            
            var { data, error } = await supabase.from('transaksi_keuangan').select('*').eq('tanggal', tgl).order('created_at', { ascending: false });
            loading.classList.add('hidden');
            if(error) return console.error(error);

            renderTabel('tbodyAbiHarian', 'emptyAbiHarian', data.filter(x => x.pelapor === 'Abi'));
            renderTabel('tbodyUmiHarian', 'emptyUmiHarian', data.filter(x => x.pelapor === 'Umi'));
            hitungSaldo(data, 'Harian');
        }

        // B. Bulanan
        async function fetchBulanan() {
            loading.classList.remove('hidden');
            var bln = document.getElementById('filterBulan').value;
            
            var { data, error } = await supabase.from('transaksi_keuangan').select('*').eq('bulan_key', bln).order('tanggal', { ascending: false }).order('created_at', { ascending: false });
            loading.classList.add('hidden');
            if(error) return console.error(error);

            renderTabel('tbodyAbiBulanan', 'emptyAbiBulanan', data.filter(x => x.pelapor === 'Abi'));
            renderTabel('tbodyUmiBulanan', 'emptyUmiBulanan', data.filter(x => x.pelapor === 'Umi'));
            hitungSaldo(data, 'Bulanan');
        }

        // C. Rekomendasi Input
        async function fetchSuggestions() {
            var { data } = await supabase.from('transaksi_keuangan').select('rincian, jumlah').order('created_at', { ascending: false }).limit(200);
            if (data) {
                const listR = document.getElementById('listRincian'); listR.innerHTML = '';
                [...new Set(data.map(i => i.rincian))].forEach(r => { 
                    const opt = document.createElement('option'); opt.value = r; listR.appendChild(opt); 
                });
                const listJ = document.getElementById('listJumlah'); listJ.innerHTML = '';
                [...new Set(data.map(i => i.jumlah))].forEach(j => { 
                    const opt = document.createElement('option'); opt.value = j; listJ.appendChild(opt); 
                });
            }
        }

        // --- 6. RENDER & HITUNG ---
        function renderTabel(tbodyId, emptyId, dataset) {
            var tbody = document.getElementById(tbodyId);
            var empty = document.getElementById(emptyId);
            tbody.innerHTML = '';
            
            if(dataset.length === 0) { empty.classList.remove('hidden'); return; }
            empty.classList.add('hidden');

            dataset.forEach(item => {
                var color = item.jenis === 'pengeluaran' ? 'text-red-500' : 'text-green-600';
                var d = new Date(item.tanggal);
                var tgl = `${d.getDate()}/${d.getMonth()+1}`;
                
                var tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 border-b border-slate-50 transition";
                tr.innerHTML = `
                    <td class="px-4 py-3 w-[15%] text-slate-400 text-[10px] font-mono align-top pt-4">${tgl}</td>
                    <td class="px-4 py-3 w-[55%] text-slate-700 font-medium editable text-xs align-top pt-4 cursor-pointer" onclick="editData(${item.id}, 'rincian', '${item.rincian}')">${item.rincian}</td>
                    <td class="px-4 py-3 w-[30%] text-right font-bold ${color} editable text-xs align-top pt-4 cursor-pointer" onclick="editData(${item.id}, 'jumlah', '${item.jumlah}')">${formatRupiah(item.jumlah)}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function hitungSaldo(data, suffix) {
            var s = { abi: {m:0, k:0}, umi: {m:0, k:0} };
            data.forEach(i => {
                var n = parseFloat(i.jumlah);
                var p = i.pelapor === 'Abi' ? s.abi : s.umi;
                i.jenis === 'pemasukan' ? p.m += n : p.k += n;
            });

            ['Abi', 'Umi'].forEach(who => {
                var key = who.toLowerCase();
                document.getElementById(`masuk${who}${suffix}`).innerText = formatRupiah(s[key].m);
                document.getElementById(`keluar${who}${suffix}`).innerText = formatRupiah(s[key].k);
                document.getElementById(`sisa${who}${suffix}`).innerText = formatRupiah(s[key].m - s[key].k);
            });
        }

        // --- 7. EDIT & HAPUS ---
        async function editData(id, field, oldVal) {
            const isNum = field === 'jumlah';
            const { value: newVal } = await Swal.fire({
                title: 'Ubah Data', input: isNum?'number':'text', inputValue: oldVal, showCancelButton:true, confirmButtonText:'Simpan', footer:'<span class="text-xs text-slate-400">Kosong/0 = HAPUS</span>'
            });
            if(newVal === undefined) return;

            if(!newVal || newVal.toString() === '0') {
                Swal.fire({title:'Hapus?', icon:'warning', showCancelButton:true, confirmButtonColor:'#EF4444', confirmButtonText:'Hapus'}).then(async r => {
                    if(r.isConfirmed) { await supabase.from('transaksi_keuangan').delete().eq('id', id); refreshActiveTab(); }
                }); return;
            }

            var pl = {}; pl[field] = isNum ? parseFloat(newVal) : newVal;
            await supabase.from('transaksi_keuangan').update(pl).eq('id', id);
            refreshActiveTab();
            Swal.fire({icon:'success', title:'Disimpan', timer:1000, showConfirmButton:false});
        }

        function refreshActiveTab() {
            if(!views.harian.classList.contains('hidden')) fetchHarian();
            if(!views.bulanan.classList.contains('hidden')) fetchBulanan();
        }

        // --- 8. SUBMIT FORM ---
        document.getElementById('formTransaksi').addEventListener('submit', async function(e) {
            e.preventDefault();
            var btn = document.getElementById('btnSubmit'); btn.innerText='Menyimpan...'; btn.disabled=true;
            var tgl = document.getElementById('inputTanggal').value;
            
            var payload = {
                tanggal: tgl, 
                bulan_key: tgl.slice(0, 7),
                pelapor: document.getElementById('inputPelapor').value,
                jenis: document.getElementById('inputJenis').value,
                jumlah: document.getElementById('inputJumlah').value,
                rincian: document.getElementById('inputRincian').value
            };

            var { error } = await supabase.from('transaksi_keuangan').insert([payload]);
            btn.innerText='Simpan Data'; btn.disabled=false;

            if(!error) {
                Swal.fire({icon:'success', title:'Berhasil', timer:1200, showConfirmButton:false});
                this.reset(); document.getElementById('inputTanggal').valueAsDate = new Date();
                // Auto pindah ke Harian
                document.getElementById('filterTanggal').value = tgl;
                pindahTab('harian');
            } else { Swal.fire('Error', error.message, 'error'); }
        });

        // --- 9. PWA INSTALL & INIT ---
        let deferredPrompt; const btnInstall = document.getElementById('btnInstall');
        if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
        window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; btnInstall.classList.remove('hidden'); btnInstall.classList.add('flex'); });
        btnInstall.addEventListener('click', async () => { if(deferredPrompt) { deferredPrompt.prompt(); const {outcome} = await deferredPrompt.userChoice; if(outcome==='accepted') btnInstall.classList.add('hidden'); deferredPrompt=null; } });

        // Helper Format Rupiah
        function formatRupiah(n) { return new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', minimumFractionDigits:0}).format(n); }

        // Start
        window.addEventListener('DOMContentLoaded', () => {
            // Splash: Android PWA akan menampilkan splash bawaan (berbasis icon) sebentar.
            // Untuk menghindari efek 'berganti cepat', kita tahan splash in-app minimal beberapa saat
            // lalu fade-out setelah page benar-benar selesai load.
            const splash = document.getElementById('appSplash');
            const splashStart = (window.performance && performance.now) ? performance.now() : Date.now();
            const MIN_SPLASH_MS = 1100;

            const hideSplash = () => {
                if(!splash) return;
                const now = (window.performance && performance.now) ? performance.now() : Date.now();
                const elapsed = now - splashStart;
                const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
                setTimeout(() => {
                    splash.classList.add('fade-out');
                    setTimeout(() => splash.remove(), 450);
                }, wait);
            };

            // Pastikan gambar splash sudah siap agar tidak ada kedip putih/blur saat decode
            (async () => {
                try {
                    const img = new Image();
                    img.src = 'splash-1080x1920.png';
                    if (img.decode) await img.decode();
                } catch (_) {}
            })();

            // Hilangkan splash setelah semua asset utama selesai load
            window.addEventListener('load', hideSplash, { once: true });

            document.getElementById('inputTanggal').valueAsDate = new Date();
            document.getElementById('filterTanggal').valueAsDate = new Date();
            
            var now = new Date();
            document.getElementById('filterBulan').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            
            pindahTab('input');
            
            document.getElementById('filterTanggal').addEventListener('change', fetchHarian);
            document.getElementById('filterBulan').addEventListener('change', fetchBulanan);
        });
  // Setelah app siap, kembalikan theme-color ke biru (untuk status bar), tanpa mengubah splash sistem.
  (function(){
    const BLUE = '#0B5BD3';
    function setThemeColor(color){
      let meta = document.querySelector('meta[name="theme-color"]');
      if(!meta){
        meta = document.createElement('meta');
        meta.setAttribute('name','theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', color);
    }
    window.addEventListener('load', function(){
      setThemeColor(BLUE);
    });
  })();
</script>

