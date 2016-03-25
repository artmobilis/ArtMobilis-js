# ArtMobilis-app

[![Join the chat at https://gitter.im/artmobilis/ArtMobilis-js](https://badges.gitter.im/artmobilis/ArtMobilis-js.svg)](https://gitter.im/artmobilis/ArtMobilis-js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Lancer le projet

### 1 - Installer Node

### 2 - Installer bower
 ```npm install -g bower```
 
### 3 - Installer les dépendances
- aller à la racine du projet
- ```npm install```
- ```bower install```

### 4 - Lancer le projet Ionic sur pc
```ionic serve```

## Compiler pour Android

### 1 - Ajouter la plateforme Android
```ionic platform add android```

### 2 - Compiler l'application
Compiler en mode debug: ```ionic build android```  
Compiler en mode release: ```ionic build --release android```  
Compiler en mode debug et installer sur device: ```ionic run android```  