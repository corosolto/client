/**
 * Swizzle (wrap total) do LocaleDropdownNavbarItem do theme-classic 3.6.3.
 *
 * POR QUE ELE EXISTE: o componente original monta o link da outra locale trocando só o
 * baseUrl e mantendo o resto do pathname (useAlternatePageUtils — a limitação é a issue
 * facebook/docusaurus#9170). Isso pressupõe que a MESMA página tem o MESMO caminho nas
 * duas locales. Aqui não tem: as páginas EN ganharam slugs em inglês (/docs/en/contributing)
 * enquanto as PT continuam nos ids (/docs/colaborar). Com a troca ingênua, o dropdown
 * apontava para /docs/contributing e /docs/en/colaborar — 404 nos dois sentidos, medido
 * no HTML gerado.
 *
 * O fix é um mapa explícito par-a-par. Os ids são os mesmos nas duas locales; só o slug
 * muda. Página que não está no mapa (ex.: 404) cai no comportamento original.
 */
import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import {translate} from '@docusaurus/Translate';
import {useLocation} from '@docusaurus/router';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import styles from './styles.module.css';

// Par [sufixo PT, sufixo EN] de cada doc, na ordem da sidebar. Sem barra final.
// Mexeu em slug de frontmatter? Mexa aqui junto — nenhuma régua cobre este mapa.
const SLUG_PAIRS = [
  ['', ''], // comecando — home dos docs
  ['/stack', '/stack'],
  ['/instrumentacao-ai', '/ai-instrumentation'],
  ['/quality-gates', '/quality-gates'],
  ['/botbrain', '/botbrain'],
  ['/arquitetura', '/architecture'],
  ['/colaborar', '/contributing'],
  ['/estado', '/status'],
];

export default function LocaleDropdownNavbarItem({
  mobile,
  dropdownItemsBefore,
  dropdownItemsAfter,
  queryString = '',
  ...props
}) {
  const {
    siteConfig: {baseUrl},
    i18n: {currentLocale, defaultLocale, locales, localeConfigs},
  } = useDocusaurusContext();
  const alternatePageUtils = useAlternatePageUtils();
  const {pathname, search, hash} = useLocation();

  const baseUrlUnlocalized =
    currentLocale === defaultLocale
      ? baseUrl
      : baseUrl.replace(`/${currentLocale}/`, '/');
  // Sufixo da página atual sem o baseUrl e sem barra final: '/docs/en/contributing/' -> '/contributing'
  const suffix = pathname.replace(baseUrl, '/').replace(/\/+$/, '');
  const currentIndex = currentLocale === defaultLocale ? 0 : 1;
  const pair = SLUG_PAIRS.find((p) => p[currentIndex] === suffix);

  function createUrl(locale) {
    if (!pair) {
      // Fora do mapa: comportamento original (troca ingênua de baseUrl).
      return alternatePageUtils.createUrl({locale, fullyQualified: false});
    }
    const targetBase =
      locale === defaultLocale
        ? baseUrlUnlocalized
        : `${baseUrlUnlocalized}${locale}/`;
    const targetSuffix = pair[locale === defaultLocale ? 0 : 1].replace(/^\//, '');
    return `${targetBase}${targetSuffix}`;
  }

  const localeItems = locales.map((locale) => {
    const baseTo = `pathname://${createUrl(locale)}`;
    // preserve ?search#hash suffix on locale switches
    const to = `${baseTo}${search}${hash}${queryString}`;
    return {
      label: localeConfigs[locale].label,
      lang: localeConfigs[locale].htmlLang,
      to,
      target: '_self',
      autoAddBaseUrl: false,
      className:
        // eslint-disable-next-line no-nested-ternary
        locale === currentLocale
          ? mobile
            ? 'menu__link--active'
            : 'dropdown__link--active'
          : '',
    };
  });
  const items = [...dropdownItemsBefore, ...localeItems, ...dropdownItemsAfter];
  const dropdownLabel = mobile
    ? translate({
        message: 'Languages',
        id: 'theme.navbar.mobileLanguageDropdown.label',
        description: 'The label for the mobile language switcher dropdown',
      })
    : localeConfigs[currentLocale].label;
  return (
    <DropdownNavbarItem
      {...props}
      mobile={mobile}
      label={
        <>
          <IconLanguage className={styles.iconLanguage} />
          {dropdownLabel}
        </>
      }
      items={items}
    />
  );
}
