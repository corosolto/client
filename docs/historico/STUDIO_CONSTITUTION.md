# STUDIO CONSTITUTION — CS BRASIL

Princípios que não mudam, valem para qualquer modelo/agente que trabalhe neste repo.

1. **Medir antes de mostrar.** Nenhuma mudança visual/jogável é declarada pronta sem
   evidência (screenshot headless, vídeo, ou número). O juiz final é o usuário, não o agente.
2. **Conhecimento mora no repositório, nunca na memória do modelo.** Decisões vão para
   CHANGELOG/commits/docs; um agente novo deve conseguir assumir lendo o repo.
3. **Nenhum asset entra sem validação.** Modelo novo passa pelo eval (rig, tris, textura,
   orientação, bbox) antes de integrar.
4. **Nenhuma regressão de performance ou de gameplay.** Medimos antes e depois
   (frame time, timeScale, cobertura). Regrediu, volta.
5. **Jogabilidade > conteúdo.** Feel, movimento e leitura visual primeiro; conteúdo novo
   depois que o núcleo estiver sólido.
6. **Mudança pequena e verificável.** Commits lógicos e pequenos, um problema por vez.
7. **Automação antes de repetição manual.** A segunda vez que algo é feito à mão, vira
   script em tools/.
8. **Reutilizar antes de recriar.** Engine e assets existentes primeiro; reescrever é
   último recurso (e exige justificativa).
9. **Sem hacks silenciosos.** Todo workaround é comentado no código com o porquê.
10. **A barra de qualidade é ev.io (three.js).** Toda decisão de feel/polimento responde:
    "ev.io faria assim?" — se não, por quê.
