# SmartCity Mobile App

## Estrutura do Projeto

```
mobile_app/
├── lib/
│   ├── config.dart                  # Credenciais Supabase
│   ├── main_citizen.dart            # Entry point — App do Cidadão
│   ├── main_field.dart              # Entry point — App da Equipe de Campo
│   ├── models/
│   │   ├── occurrence.dart          # Modelo de Ocorrência
│   │   ├── service_order.dart       # Modelo de Ordem de Serviço
│   │   └── profile.dart            # Modelo de Perfil/Gamificação
│   ├── services/
│   │   ├── supabase_service.dart   # Auth, DB, Storage
│   │   └── offline_service.dart    # Hive + fila de sincronização
│   └── views/
│       ├── citizen/
│       │   ├── citizen_login_view.dart     # Login + Registo
│       │   ├── citizen_dashboard_view.dart # Mapa de ocorrências
│       │   ├── citizen_report_view.dart    # Reportar ocorrência
│       │   └── citizen_history_view.dart   # Histórico + Gamificação
│       └── field/
│           ├── field_login_view.dart       # Login da equipe
│           ├── field_os_list_view.dart     # Lista de OSs
│           └── field_os_detail_view.dart   # Detalhe + Checklist + Assinatura
└── android/
    ├── app/
    │   ├── build.gradle             # Config de flavors
    │   └── src/main/
    │       ├── AndroidManifest.xml  # Permissões
    │       ├── kotlin/.../MainActivity.kt
    │       └── res/xml/file_paths.xml
    ├── build.gradle                 # Raiz do projeto
    ├── settings.gradle
    └── gradle.properties
```

## Pré-requisitos

1. **Flutter SDK** — https://docs.flutter.dev/get-started/install/windows
2. **Android Studio** (com Android SDK 34+)
3. **Java 17** (incluído no Android Studio)

## Configuração Inicial

### 1. Definir credenciais Supabase
Edite `lib/config.dart` e substitua as placeholders:
```dart
static const supabaseUrl = 'https://SEU_PROJECT_REF.supabase.co';
static const supabaseAnonKey = 'SUA_ANON_KEY';
```

### 2. Configurar local.properties
Crie `android/local.properties`:
```
sdk.dir=C:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\sdk
flutter.sdk=C:\\flutter
flutter.buildMode=debug
flutter.versionName=1.0.0
flutter.versionCode=1
```

### 3. Instalar dependências
```bash
cd mobile_app
flutter pub get
```

## Executar os Apps

### App do Cidadão
```bash
flutter run --flavor citizen --target lib/main_citizen.dart
```

### App da Equipe de Campo
```bash
flutter run --flavor field --target lib/main_field.dart
```

## Build de Release

```bash
# APK do Cidadão
flutter build apk --flavor citizen --target lib/main_citizen.dart --release

# APK da Equipe
flutter build apk --flavor field --target lib/main_field.dart --release
```

## Funcionalidades Implementadas

### 🏙️ App do Cidadão
- ✅ Login / Registo com Supabase Auth
- ✅ Dashboard com lista de ocorrências filtráveis por categoria
- ✅ Registo de ocorrências com GPS automático, fotos (até 5), categoria, prioridade
- ✅ Suporte offline (Hive) — sincroniza ao reconectar
- ✅ Confirmação de ocorrências de outros cidadãos (+5 pts)
- ✅ Histórico pessoal com sistema de gamificação (pontos, níveis, progresso)

### 🔧 App da Equipe de Campo
- ✅ Login institucional separado (tema visual distinto)
- ✅ Lista de Ordens de Serviço com filtros e estatísticas
- ✅ Detalhe da OS com:
  - Checklist interativo com barra de progresso
  - Fotos "Antes" e "Depois" com upload para Supabase Storage
  - Relatório de execução
  - Assinatura digital canvas
  - Fluxo de estados: Aberta → Em Execução → Concluída
