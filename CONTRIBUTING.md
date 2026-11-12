# Přispívání · Contributing

Díky, že chcete pomoct! 🙌 *English speakers: issues and PRs in English are welcome too.*

## Než začnete

- U větší změny nejdřív založte **issue** a domluvme se na řešení.
- Malé opravy (překlepy, drobné chyby) posílejte rovnou jako pull request.
- Chování k ostatním se řídí [Kodexem chování](CODE_OF_CONDUCT.md).

## Vývojové prostředí

Potřebujete Node 22+, JDK 17 a Android SDK (API 37, build-tools 37, NDK 27.1).

```bash
npm ci
npm run typecheck
npm run android     # dev build na telefon s USB laděním
```

Nativní kód je v `modules/focus-lock/android/`. Po jeho změně je potřeba aplikaci znovu sestavit, Fast Refresh nativní kód nepřenačte.

## Pravidla pro kód

- **TypeScript:** `npm run typecheck` musí projít bez chyb.
- **Kotlin:** držte se stávajícího stylu (2 mezery, žádné `!!`).
- **Složka `android/`** se generuje (`expo prebuild`) a needitujte ji ručně. Nativní nastavení patří do `modules/focus-lock` nebo `app.json`.
- **Bezpečnost je priorita.** Změny, které by dítěti usnadnily zámek obejít (např. povolení Nastavení nebo slabší ochrana PINu), nebudou přijaty.
- **Soukromí:** aplikace nesmí nic odesílat po síti a nesmí obsahovat analytiku ani reklamy.
- Texty v aplikaci jsou česky.

## Commity a pull requesty

- Pište commity v rozkazovacím způsobu, ideálně podle [Conventional Commits](https://www.conventionalcommits.org/): `feat: časovač zámku`, `fix: blokování Game Turbo na Xiaomi`.
- Jeden PR = jedna věc.
- Vyplňte šablonu PR a popište, **jak jste změnu otestovali** (model telefonu, verze Androidu).
- CI musí být zelené.

## Hlášení chyb

Použijte [šablonu pro chyby](https://github.com/evzenloveczen123/rodicovsky-zamek/issues/new/choose). Uveďte výrobce a model telefonu, verzi Androidu a postup, jak chybu vyvolat. **Způsoby obejití zámku** hlaste soukromě podle [SECURITY.md](SECURITY.md).
