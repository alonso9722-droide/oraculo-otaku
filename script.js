document.addEventListener('DOMContentLoaded', () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (!sessionStorage.getItem('vistos_ids')) {
        sessionStorage.setItem('vistos_ids', JSON.stringify([]));
    }

    function playBeep(freq, type, duration, vol) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    function typeWriter(text, elementId, speed = 30) {
        let i = 0;
        const el = document.getElementById(elementId);
        el.innerHTML = "";
        return new Promise(resolve => {
            function type() {
                if (i < text.length) {
                    el.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else { resolve(); }
            }
            type();
        });
    }

    async function getLiveAnime(mood) {
        try {
            const randomPage = Math.floor(Math.random() * 60) + 1;
            const response = await fetch(`https://api.jikan.moe/v4/anime?page=${randomPage}&limit=20&order_by=score&sort=desc`);
            const data = await response.json();
            const list = data.data;
            
            let vistosIds = JSON.parse(sessionStorage.getItem('vistos_ids'));
            let targetGenre = "";
            if (mood.match(/(triste|solo|depre|pena|llorar)/)) targetGenre = "Drama";
            if (mood.match(/(accion|pelea|fuerte|ganar|poder)/)) targetGenre = "Action";
            if (mood.match(/(risa|comedia|divertido|gracia)/)) targetGenre = "Comedy";
            if (mood.match(/(miedo|terror|oscuro|muerte)/)) targetGenre = "Horror";
            if (mood.match(/(amor|romance|pareja|corazon)/)) targetGenre = "Romance";

            let candidates = list.filter(anime => {
                const matchesGenre = targetGenre ? anime.genres.some(g => g.name === targetGenre) : true;
                return matchesGenre && !vistosIds.includes(anime.mal_id);
            });

            if (candidates.length === 0) candidates = list.filter(a => !vistosIds.includes(a.mal_id));
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            
            vistosIds.push(chosen.mal_id);
            sessionStorage.setItem('vistos_ids', JSON.stringify(vistosIds));

            // Lógica de rarezas basada en Score
            const score = chosen.score || 7.0;
            let rareza = { cls: "rareza-comun", txt: "CLASE: COMÚN", brd: "" };

            if (score >= 8.7) {
                rareza = { cls: "rareza-legendaria", txt: "CLASE: LEGENDARIO", brd: "legendary-border" };
            } else if (score >= 8.1) {
                rareza = { cls: "rareza-raro", txt: "CLASE: RARO", brd: "raro-border" };
            } else if (score >= 7.6) {
                rareza = { cls: "rareza-poco-comun", txt: "CLASE: POCO COMÚN", brd: "poco-comun-border" };
            }

            return {
                t: chosen.title,
                i: chosen.images.jpg.large_image_url,
                score: score,
                rareza: rareza,
                m: `Protocolo: ${chosen.type || 'TV'}. Año: ${chosen.year || 'N/A'}.`
            };
        } catch (e) {
            return { t: "Cyberpunk: Edgerunners", i: "https://cdn.myanimelist.net/images/anime/1818/126435.jpg", score: 8.6, rareza: {cls:"rareza-raro", txt:"CLASE: RARO", brd:"raro-border"}, m: "Offline Mode." };
        }
    }

    document.getElementById('btn-analizar').addEventListener('click', async () => {
        const nombre = document.getElementById('nombre').value.trim();
        const animo = document.getElementById('animo').value.toLowerCase();

        if (!nombre || animo.length < 3) {
            document.getElementById('error-msg').classList.remove('hidden');
            return;
        }

        playBeep(200, 'sine', 0.1, 0.1);
        document.getElementById('input-section').classList.add('hidden');
        document.getElementById('loading').classList.remove('hidden');

        const animeData = await getLiveAnime(animo);

        setTimeout(async () => {
            const rTag = document.getElementById('rareza-tag');
            const resBox = document.getElementById('resultado');
            const poster = document.getElementById('animePoster');

            document.getElementById('loading').classList.add('hidden');
            resBox.classList.remove('hidden');

            // Reset y aplicar rarezas
            resBox.classList.remove('legendary-border', 'raro-border', 'poco-comun-border');
            rTag.innerText = animeData.rareza.txt;
            rTag.className = animeData.rareza.cls;
            if (animeData.rareza.brd) resBox.classList.add(animeData.rareza.brd);

            // Sonido diferencial
            if (animeData.score >= 8.7) playBeep(880, 'sine', 0.6, 0.1);
            else if (animeData.score >= 8.0) playBeep(600, 'sine', 0.3, 0.1);
            else playBeep(400, 'sine', 0.2, 0.1);

            document.getElementById('report-num').innerText = Math.floor(Math.random()*9999);
            document.getElementById('mensajePersonal').innerText = `SUJETO: ${nombre.toUpperCase()}`;

            poster.src = animeData.i;
            poster.onload = () => {
                poster.classList.remove('hidden');
                setTimeout(() => poster.classList.add('visible'), 50);
            };

            await typeWriter(animeData.t, 'animeSugerido', 50);
            await typeWriter(`[REPORTE] ${animeData.m}`, 'descripcionPrediccion', 30);

            const sinc = (animeData.score * 10).toFixed(1);
            document.getElementById('match-percent').innerText = sinc;
            document.getElementById('prob-bar').style.width = sinc + "%";
            
            document.getElementById('share-button').classList.remove('hidden');
            document.getElementById('btn-reset').classList.remove('hidden');
        }, 2000);
    });

    document.getElementById('share-button').addEventListener('click', () => {
        html2canvas(document.getElementById('capture-area'), {
            useCORS: true,
            backgroundColor: "#050508",
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `ORACULO_EXPEDIENTE_${Date.now()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    });

    document.getElementById('btn-reset').addEventListener('click', () => location.reload());

    // Partículas
    const cvs = document.getElementById('particles'); const ctx = cvs.getContext('2d');
    let pts = [];
    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; pts = []; for(let i=0; i<40; i++) pts.push({x:Math.random()*cvs.width, y:Math.random()*cvs.height, v:Math.random()*0.4+0.1}); };
    window.onresize = resize; resize();
    function draw() { ctx.clearRect(0,0,cvs.width,cvs.height); ctx.fillStyle = '#00f2ff'; pts.forEach(p => { p.y -= p.v; if(p.y<0) p.y=cvs.height; ctx.fillRect(p.x, p.y, 2, 2); }); requestAnimationFrame(draw); }
    draw();
});