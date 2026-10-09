(() => {
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
  window.__captureOffline = true;
  // User works in other projects: this local capture page never enters fullscreen.
  Element.prototype.requestFullscreen = function () { return Promise.resolve(); };
  if (Element.prototype.webkitRequestFullscreen) Element.prototype.webkitRequestFullscreen = function () {};

  const originalFetch = window.fetch.bind(window);
  window.fetch = (resource, options) => {
    const url = new URL(typeof resource === 'string' ? resource : resource.url || resource.href, location.href);
    if (url.pathname.startsWith('/api/')) return Promise.resolve(new Response(JSON.stringify({ok:false,error:'capture_local_no_backend'}), {status:503,headers:{'Content-Type':'application/json'}}));
    return originalFetch(resource, options);
  };
  const originalBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (resource, data) => new URL(resource, location.href).pathname.startsWith('/api/') ? false : originalBeacon(resource, data);
  const mix = new AudioContext(), sink = mix.createMediaStreamDestination();
  const connect = AudioNode.prototype.connect, taps = new WeakMap();
  AudioNode.prototype.connect = function (destination, ...rest) {
    const result = connect.call(this, destination, ...rest);
    if (destination instanceof AudioDestinationNode && this.context !== mix) {
      let tap = taps.get(this.context);
      if (!tap) {
        tap = this.context.createMediaStreamDestination();
        mix.createMediaStreamSource(tap.stream).connect(sink);
        taps.set(this.context, tap);
      }
      connect.call(this, tap);
    }
    return result;
  };
  const OriginalAudio = window.Audio;
  window.Audio = function (...args) {
    const audio = new OriginalAudio(...args), play = audio.play.bind(audio);
    let source;
    audio.play = function () {
      if (!source) {
        source = mix.createMediaElementSource(audio);
        source.connect(mix.destination);
        source.connect(sink);
      }
      return play();
    };
    return audio;
  };
  window.Audio.prototype = OriginalAudio.prototype;
  let game, armed = false, busy = false, saving = false, timer, recorder, chunks = [], recordingStream, origin, orbitFrame;
  const valid = () => armed && window.__game === game && !game.online;
  const keys = {w:'KeyW', a:'KeyA', s:'KeyS', d:'KeyD', r:'KeyR', e:'KeyE', z:'KeyZ', '1':'Digit1', '4':'Digit4', '5':'Digit5', space:'Space', shift:'ShiftLeft'};
  const event = (type, key) => document.dispatchEvent(new KeyboardEvent(type, {key, code:keys[key], bubbles:true}));
  function release() {
    cancelAnimationFrame(orbitFrame);
    for (const key of Object.keys(keys)) event('keyup', key);
    game?.renderer.domElement.dispatchEvent(new MouseEvent('mouseup', {button:0,bubbles:true}));
    busy = false;
  }
  addEventListener('pagehide', release);
  addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `#capture-panel{position:fixed;top:65px;left:170px;z-index:100000;background:#101419e8;color:white;padding:8px;font:12px system-ui;max-width:1050px}#capture-panel button,#capture-panel input,#capture-panel select{font:inherit;margin:3px;padding:4px}body.capture-armed #lock-hint{display:none!important}`;
    document.head.append(style);
    const panel = document.createElement('div'); panel.id = 'capture-panel'; panel.dataset.entradaPropria = '';
    panel.innerHTML = `<button id="capture-arm">Ativar controles locais</button><label>Take <input id="capture-name" value="codex-peruca-posto-v5"></label><button id="capture-start">Gravar canvas + áudio</button><button id="capture-stop">Parar e salvar</button><label>Duração <select id="capture-duration"><option>0.25</option><option>0.5</option><option>1</option><option selected>3</option><option>5</option></select>s</label><label><input type="checkbox" id="capture-fire">Atirar junto</label><label><input type="checkbox" id="capture-orbit">Órbita durante movimento</label><label><input type="checkbox" id="capture-auto-save">Salvar ao concluir</label><label><input type="checkbox" id="capture-auto-pause" checked>Pausar ao concluir</label><button data-orbit="3.14159265359">Revelar rosto</button><button data-orbit="0">Voltar câmera</button><button data-keys="w">Avançar W</button><button data-keys="a">Esquerda A</button><button data-keys="d">Direita D</button><button data-keys="s">Recuar S</button><button data-keys="w,d">Diagonal W+D</button><button data-keys="w,shift">Correr W+Shift</button><button data-keys="">Rajada</button><button data-keys="r">Recarregar R</button><button data-keys="4">Fumaça 4</button><button data-keys="5">Granada 5</button><button data-look="-90">Olhar esquerda</button><button data-look="90">Olhar direita</button><button data-pitch="45">Mira abaixo</button><button data-pitch="-45">Mira acima</button><button id="capture-release">Soltar / Pausar</button><div id="capture-status">Aguardando partida local. Sem gravação.</div>`;
    document.body.append(panel);
    for (const type of ['mousedown','mouseup','mousemove']) panel.addEventListener(type, event => event.stopPropagation());
    const status = panel.querySelector('#capture-status'), duration = panel.querySelector('#capture-duration');
    const report = (message) => { status.dataset.message = message; status.textContent = message; };
    panel.querySelector('#capture-arm').onclick = async () => {
      const current = window.__game;
      if (!current || current.online) { report('Abra uma partida singleplayer primeiro.'); return; }
      if (current !== game) { clearTimeout(timer); release(); game = current; armed = false; }
      if (!armed) {
        const originalAccept = game._acceptInput.bind(game);
        game._acceptInput = () => originalAccept() || (armed && !game._entradaTravada && !game.paused && ['live','countdown'].includes(game.state));
        game._requestLock = () => {};
        armed = true;
        origin = game.player.pos.clone();
      }
      await mix.resume();
      game.setPaused(false);
      document.body.classList.add('capture-armed');
      report('Controles locais ativos — física e combate originais.');
    };
    function orbitTo(target, seconds) {
      if (game.camView === 'first') { report('Órbita requer terceira pessoa.'); return; }
      cancelAnimationFrame(orbitFrame);
      const start = performance.now(), from = game._tpOrbitYaw || 0;
      let previous = from;
      function frame(now) {
        if (!valid() || !game.player.alive || !game._acceptInput() || game.camView === 'first') return;
        const progress = Math.min(1, (now - start) / (seconds * 1000));
        const ease = progress * progress * (3 - 2 * progress), angle = from + (target - from) * ease;
        const sensitivity = game.settings.sens * 0.0021 * (game.player.scoped ? Math.max(0.28, game.camera.fov / 70) : 1);
        const move = new MouseEvent('mousemove', {bubbles:true,altKey:true});
        Object.defineProperties(move, {movementX:{value:-(angle-previous)/sensitivity},movementY:{value:0}});
        game.renderer.domElement.dispatchEvent(move); previous = angle;
        if (progress < 1) orbitFrame = requestAnimationFrame(frame);
      }
      orbitFrame = requestAnimationFrame(frame);
    }
    panel.querySelectorAll('[data-orbit]').forEach(button => button.onclick = () => {
      if (!valid() || !game._acceptInput() || !game.player.alive) return;
      orbitTo(Number(button.dataset.orbit), 1.5);
    });
    panel.querySelectorAll('[data-keys]').forEach(button => button.onclick = () => {
      if (valid() && game.paused) game.setPaused(false);
      if (!valid() || !game._acceptInput() || !game.player.alive) { report('Ative controles locais numa partida viva primeiro.'); return; }
      clearTimeout(timer); release();
      const held = button.dataset.keys.split(',').filter(Boolean);
      for (const key of held) event('keydown', key);
      if (panel.querySelector('#capture-fire').checked || !held.length) {
        game.renderer.domElement.dispatchEvent(new MouseEvent('mousedown', {button:0,bubbles:true}));
      }
      busy = true;
      const seconds = Math.min(5, Math.max(0.1, Number(duration.value)));
      report(`${button.textContent} — ${seconds}s`);
      if (panel.querySelector('#capture-orbit').checked) orbitTo((game._tpOrbitYaw || 0) + Math.PI * 2, seconds);
      timer = setTimeout(() => {
        release();
        if (panel.querySelector('#capture-auto-pause').checked && valid()) game.setPaused(true);
        if (panel.querySelector('#capture-auto-save').checked && recorder?.state === 'recording') recorder.stop();
      }, seconds * 1000);
    });
    panel.querySelectorAll('[data-look]').forEach(button => button.onclick = () => {
      if (!valid() || !game._acceptInput() || !game.player.alive) return;
      const move = new MouseEvent('mousemove', {bubbles:true});
      Object.defineProperties(move, {movementX:{value:Number(button.dataset.look)},movementY:{value:0}});
      game.renderer.domElement.dispatchEvent(move);
    });
    panel.querySelectorAll('[data-pitch]').forEach(button => button.onclick = () => {
      if (!valid() || !game._acceptInput() || !game.player.alive) return;
      const move = new MouseEvent('mousemove', {bubbles:true});
      Object.defineProperties(move, {movementX:{value:0},movementY:{value:Number(button.dataset.pitch)}});
      game.renderer.domElement.dispatchEvent(move);
    });
    panel.querySelector('#capture-release').onclick = () => { release(); game?.setPaused(true); report('Controles soltos; partida pausada.'); };
    panel.querySelector('#capture-start').onclick = async () => {
      if (!valid() || saving || recorder?.state === 'recording') return;
      try {
        saving = true;
        clearTimeout(timer); release();
        await mix.resume();
        const takeName = panel.querySelector('#capture-name').value;
        recordingStream = game.renderer.domElement.captureStream(30);
        for (const track of sink.stream.getAudioTracks()) recordingStream.addTrack(track);
        const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(mime => MediaRecorder.isTypeSupported(mime));
        recorder = new MediaRecorder(recordingStream, {mimeType, videoBitsPerSecond:12000000});
        chunks = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = async () => {
          clearTimeout(timer); release(); game.setPaused(true);
          report('Salvando…');
          try {
            const response = await fetch('/__capture/save?name=' + encodeURIComponent(takeName), {method:'POST',body:new Blob(chunks,{type:mimeType})});
            report(await response.text());
          } catch (error) { report('Falha ao salvar: ' + error.message); }
          for (const track of recordingStream.getVideoTracks()) track.stop();
          saving = false;
        };
        recorder.start(1000);
        report('GRAVANDO canvas + áudio real; controles não entram no vídeo.');
      } catch (error) { saving = false; report('Captura falhou: ' + error.message); }
    };
    panel.querySelector('#capture-stop').onclick = () => { if (recorder?.state === 'recording') recorder.stop(); };
    setInterval(() => {
      if (!game || !origin) return;
      if (busy && (!valid() || !game.player.alive || !game._acceptInput())) release();
      if (window.__game !== game) { armed = false; document.body.classList.remove('capture-armed'); }
      const p = game.player, distance = p.pos.distanceTo(origin).toFixed(1);
      const ammo = document.querySelector('#ammo')?.textContent?.trim() || '';
      const alive = p.alive ? 'vivo' : 'morto';
      status.textContent = `${status.dataset.message || ''} | distância do início ${distance}m | ${alive} | arma ${p.weapon} | munição ${ammo} | ${busy ? 'comando em curso' : 'comando concluído'} | gravação ${recorder?.state || 'inativa'}`;
    }, 300);
  });
})();
