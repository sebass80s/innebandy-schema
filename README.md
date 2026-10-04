# Innebandy Schema

En liten webbapp för att skapa ett rättvist roterande spelarschema för ett innebandylag.

## V1

- 18 barn i laget
- 4 tränare, var och en kopplad till sitt barn
- 2 tränare per match
- tränarnas barn är alltid uttagna när respektive tränare är med
- antal matcher och antal barn per match är inställningar
- generatorn försöker minimera skillnaden i antal matcher och undvika långa spel-/vilosviter
- flera lika bra lösningar får slumpmässig variation
- uppgifter och senaste schema sparas lokalt i webbläsaren

Standardvärden är 9 matcher och 8 barn per match.

## Kör lokalt

```bash
npm install
npm run dev
```

Öppna sedan http://localhost:3000.

## Princip för rättvisa

Rättvisa optimeras i denna ordning:

1. två tränare per match
2. tränarens barn spelar när tränaren är med
3. så liten skillnad som möjligt mellan flest och minst spelade matcher
4. så jämn spridning som möjligt över säsongen
5. slumpvariation mellan jämnbra scheman

Om tränarkravet gör helt lika antal matcher matematiskt omöjligt får tränarbarn extra matcher endast när det behövs.

## Publicering

Sajten publiceras automatiskt via GitHub Pages från `main`.
