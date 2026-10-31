# Asset de apresentação da Operação Flávio

`operacao_flavio_boarding.glb` é uma derivação local dos modelos existentes `../props/operacao_decola/aviao_executivo.glb` e `escada_embarque.glb`. Preserva suas seis texturas. Abre o portal da cabine, separa a folha e seu pivô, cria piso/acabamento/dobradiças e ajusta a escada. Uso somente na apresentação; os originais e os colisores de simulação ficam preservados.

- Avião original SHA256: `73e289cc3b53e970a8fb980364f9227b7b2fcc9ad1360a82a20c6e1c505501f9`.
- Escada original SHA256: `62d23fdea58296151804c8146f031183cc17dff6c347243191f0a055d25b73be`.
- Derivado SHA256: `6b2ace306676fe9c1d8ba8bb559c01803e8c32294e395739f7f33f947b4e4936`,852168bytes,10197triângulos. Sem geração paga nova.

Reprodução com Blender5.2.0LTS: `blender -b --factory-startup --python tools/repair-flavio-boarding.py -- --output /tmp/flavio-boarding`. Acrescente `--render` para capturas e arquivo de autoria. A reprodução do candidato aprovado gerou GLB byte idêntico ao V11.

O script conserva as coordenadas locais em metros, raiz zero, origem de apresentação Three[0,0.08,55]. Nó `boarding-door-pivot`: posição local[1.27,1.52,-2.35], folha aberta em150graus no Blender (o carregador recebe a conversão glTF). Folha e braços giram juntos; bases/eixo ficam fixos.

Crítico independente aprovou os itens estáticos medidos em31/10/2026: largura lateral conservadora0.809509m, envelope1.72×Ø0.76m, ligações físicas, abertura/material e enquadramento3:2/FOV75/17.464535m. Não aprova pés, caminhada, fechamento, taxi, carregamento no motor nem contexto integrado do aeroporto. Esses itens exigem validação separada na implementação.
