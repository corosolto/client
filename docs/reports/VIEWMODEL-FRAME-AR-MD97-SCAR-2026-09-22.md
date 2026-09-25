# Enquadramento AR — MD97 e SCAR em 22/09/2026

## Resultado

O primeiro cluster da regressão de enquadramento remove os dois vermelhos
residuais da família AR. Não altera assets nem ações: só registra overrides de
câmera por arma sobre os produtos já congelados. MD97 troca a rotação do mount
para `[-4, -4, 0]`; SCAR usa FOV 82. Família AR, catálogo global e as duas
candidatas permanecem `ready:false`.

- MD97: 0,944×/86,8% visível/1,385× de braço em 3:2; 0,891×/92,7%/1,288×
  em 16:9;
- SCAR: 0,972×/94,4% visível/0,929× de braço em 3:2; 0,900×/95,5%/0,866×
  em 16:9;
- asset gates: MD97 8 mutantes e SCAR 9 mutantes, todos mordidos;
- lifecycle: 10/10 por arma, 30 ciclos/540 amostras por arma;
- `vm-frame-calibra --armas=md97,scar`: verde nas duas proporções.

## Evidência privada

As capturas reais estão ligadas ao checkpoint `d60469593` e não entram no Git:

- `evidence/ar-frame-md97-20260922-0510`: 20 PNGs, zero fatal;
  `capture.json` `2547c17b8b5d41ed39b2b9acb95444115d664c8962d6d051fee36284cfc3d8af`;
  folhas 3:2/16:9 `3bb5d6aa…`/`4f72b057…`;
- `evidence/ar-frame-scar-20260922-0512`: 20 PNGs, zero fatal;
  `capture.json` `d17838a5f9df407e08de2d2dc9a8d4dced8029fde6de1c7dcb52ee27dd5834be`;
  folhas 3:2/16:9 `1cacfa92…`/`c3908210…`.

Revisão humana ainda deve julgar escala, inclinação, contatos, ADS e ações. Os
gates técnicos e as folhas não autorizam `ready:true`.

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=md97&vmqa=precision
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&armaslazy=0&vmauthored=1&vmweapon=scar&vmqa=precision
```
