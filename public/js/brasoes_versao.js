export const BRASAO_VERSAO = Object.freeze({"b":"6b4dafd917d0","c":"a95806f6a62f","e":"f7fb3c45ceeb","f":"20c1c20b06d7","m":"47c24ae324f0","n":"755e726b8625","o":"2c7468303fc6","r":"237633253141","t":"dccae0a2b7eb","u":"7a703e200fbc"});
export const urlDoBrasao = (letra) => `img/brasoes/${letra}.png?v=${BRASAO_VERSAO[letra] || 'sem-versao'}`;
