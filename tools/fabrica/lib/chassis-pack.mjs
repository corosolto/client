// Os 20 chassis do pack (+ granada) e o que não dá para inferir da pasta.
// armaFbx: malha da arma; poseFbx: pose de idle dos braços; prefab/settings: nomes no pack.
// Onde o pack não tem pose dedicada, a ficha cita o clipe usado (e por quê).
export const CHASSIS_PACK = Object.freeze({
  AK: { armaFbx: 'Weapon/AK-200.FBX', poseFbx: 'Character/A_FP_AKX_Idle.FBX', prefab: 'AK', settings: 'AK', tipo: 'fuzil' },
  MX16A4: { armaFbx: 'Weapon/MX16A4.FBX', poseFbx: 'Character/A_FP_MX16A4_Pose.FBX', prefab: 'MX16A4', settings: 'MX16A4', tipo: 'fuzil' },
  G3: { armaFbx: 'Weapon/G3.FBX', poseFbx: 'Character/A_FP_G3_Idle.FBX', prefab: 'G3', settings: 'G3', tipo: 'fuzil' },
  Mk14EBR: { armaFbx: 'Weapon/MK14.FBX', poseFbx: 'Character/A_FP_MK14_Idle.FBX', prefab: 'Mk14EBR', settings: 'Mk14EBR', tipo: 'fuzil' },
  SVD: { armaFbx: 'Weapon/SVD.FBX', poseFbx: 'Character/A_FP_SVD_Pose.FBX', prefab: 'SVD', settings: 'SVD', tipo: 'fuzil' },
  ASVal: { armaFbx: 'Weapon/AS_Val.FBX', poseFbx: 'Character/A_FP_Val_Pose.FBX', prefab: 'ASVal', settings: 'ASVal', tipo: 'fuzil' },
  L96X: { armaFbx: 'Weapon/L96X.FBX', poseFbx: 'Character/A_FP_L96X_Pose.FBX', prefab: 'L96X', settings: 'L96X', tipo: 'ferrolho' },
  Kar98K: { armaFbx: 'Weapon/A_W_Kar98K_Pose.FBX', poseFbx: 'Character/A_FP_Kar98K_Pose.FBX', prefab: 'Kar98k', settings: 'Kar98k', tipo: 'ferrolho',
    nota: 'o pack não traz FBX de malha avulsa; a malha vem dentro de A_W_Kar98K_Pose.FBX' },
  MPS5: { armaFbx: 'Weapon/MPS5.FBX', poseFbx: 'Character/A_FP_MPS5_Pose.FBX', prefab: 'MPS5', settings: 'MPS5', tipo: 'smg' },
  PDW90: { armaFbx: 'Weapon/PDW90.FBX', poseFbx: 'Character/A_FP_PDW90_Inspect.FBX', prefab: 'PDW90', settings: 'PDW90', tipo: 'smg',
    nota: 'sem pose dedicada; o primeiro quadro de A_FP_PDW90_Inspect é a pose de mão' },
  'Striker-V': { armaFbx: 'Weapon/SKM_Striker-V.fbx', poseFbx: 'Character/A_FP_Striker-V_Pose.FBX', prefab: 'Striker-V', settings: 'Striker-V', tipo: 'smg' },
  Kolibri: { armaFbx: 'Weapon/Kolibri.FBX', poseFbx: 'Character/A_FP_Kolibri_Pose.FBX', prefab: 'Kolibri', settings: 'Kolibri', tipo: 'smg' },
  MGX5: { armaFbx: 'Weapon/MGX5.FBX', poseFbx: 'Character/A_FP_MGX5_Idle.FBX', prefab: 'MGX5', settings: 'MGX5', tipo: 'lmg' },
  KXG12: { armaFbx: 'Weapon/KXG12_fixed.FBX', poseFbx: 'Character/A_FP_KXG12_Pose.FBX', prefab: 'KXG12', settings: 'KXG12', tipo: 'escopeta',
    nota: 'KXG12_fixed.FBX é a malha corrigida que o próprio pack usa no prefab' },
  'Drake-12': { armaFbx: 'Weapon/Drake-12.FBX', poseFbx: 'Character/A_FP_Drake-12_Pose.FBX', prefab: 'Drake-12', settings: 'Drake-12', tipo: 'escopeta' },
  X18: { armaFbx: 'Weapon/SK_X18.FBX', poseFbx: 'Character/A_FP_X18_Pose.FBX', prefab: 'X18', settings: 'X18', tipo: 'pistola' },
  M1911: { armaFbx: 'Weapon/M1911.FBX', poseFbx: 'Character/A_FP_M1911_Idle.FBX', prefab: 'M1911', settings: 'M1911', tipo: 'pistola' },
  DGL50: { armaFbx: 'Weapon/DGL50.FBX', poseFbx: 'Character/A_FP_DGL50_Pose.FBX', prefab: 'DGL50', settings: 'DGL50', tipo: 'pistola' },
  'Viper-357': { armaFbx: 'Weapon/Viper-357.FBX', poseFbx: 'Character/A_FP_Viper-357_Reload_Empty.FBX', prefab: 'Viper-357', settings: 'Viper-357', tipo: 'revolver',
    nota: 'o pack não traz pose de braço; o quadro 0 da recarga vazia é a pose' },
  RPG: { armaFbx: 'Weapon/RPG7.FBX', poseFbx: 'Character/A_FP_RPG7_Pose.FBX', prefab: 'RPG', settings: 'RPG', tipo: 'lancador' },
});

// Saque: o pack só tem equip de fuzil (General); pistola usa o arco procedural do runtime.
export const EQUIP_GERAL = Object.freeze({
  fuzil: 'General/Character/A_FP_Rifle_Equip.FBX',
  ferrolho: 'General/Character/A_FP_Rifle_Equip.FBX',
  smg: 'General/Character/A_FP_Rifle_Equip.FBX',
  lmg: 'General/Character/A_FP_Rifle_Equip.FBX',
  escopeta: 'General/Character/A_FP_Rifle_Equip.FBX',
  lancador: 'General/Character/A_FP_Rifle_Equip.FBX',
});
