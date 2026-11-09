# OptimizerLab

**OptimizerLab**은 다양한 최적화 알고리즘이 매 단계 파라미터를 어떻게 갱신하는지 관찰하는 인터랙티브 도감입니다.

[웹 앱 열기](https://oyueo-mm.github.io/OptimizerLab/)

## 주요 기능

- **홈:** 대표 옵티마이저 4개의 이동 궤적을 애니메이션으로 표시합니다.
- **도감:** 알고리즘을 계열별로 탐색합니다. 카드에서 계산된 궤적을 자동 재생하고 화면 밖 카드는 정지합니다.
- **실험실:** 2D 등고선과 3D 손실 지형을 전환합니다. 지형을 클릭해 시작점을 지정하고, 3D에서는 회전·확대합니다.
- **비교:** 동일한 시작점과 손실 함수에서 최대 6개 알고리즘을 함께 재생하며 각 궤적을 다른 색으로 구별합니다. 비교 알고리즘 선택창은 체크할 때 닫히지 않으며, **적용**을 눌러야 선택 변경이 반영됩니다. **취소**하면 기존 선택을 유지합니다.
- **계보:** 대표 알고리즘의 개념적 관계를 탐색합니다.
- **재생 제어:** 재생·일시정지·단계 이동·속도 및 하이퍼파라미터 조절을 지원합니다. 설정 패널에서는 변경사항을 임시로 보관하고 **적용**을 눌러야 반영하며, **취소** 또는 패널 닫기로 편집 내용을 버립니다.

## 수록 알고리즘

현재 **41종**의 알고리즘을 구현했습니다. 주요 예시는 다음과 같습니다.

| 계열 | 주요 항목 |
|---|---|
| 경사하강법·모멘텀 | SGD, SGD Momentum, Nesterov Momentum, SGDW, QHM, AggMo, Optimistic GD |
| 적응형 학습률 | AdaGrad, AdaDelta, RMSProp, RProp, Yogi, AdaBound, AdaGradW, Adafactor(비인수분해) |
| Adam 계열 | Adam, AdamW, Adamax, AMSGrad, NAdam, RAdam, AdaBelief, AdaMod, diffGrad, PAdam, QHAdam, NAdamW |
| 부호 기반 | SignSGD, Lion |
| 대규모 배치 | LARS, LAMB, NovoGrad |
| 조합형 | Lookahead SGD, Ranger |
| 2차·공액기울기 | Newton, BFGS, L-BFGS, Nonlinear CG |

일부 항목은 특수한 하이퍼파라미터 설정을 고정한 **2차원 학습용 변형**입니다. LARS와 LAMB는 두 파라미터를 하나의 층으로 간주하며, Adafactor는 비인수분해 벡터형을 적용합니다. Muon, Shampoo, SOAP처럼 **행렬 연산이 핵심인 알고리즘을 단순 공 이동으로 대체하지 않았습니다.** 별도 행렬 시뮬레이션을 검증한 뒤 확장할 계획입니다.

## 손실 함수

물결 계곡, 볼록 함수, 좁은 계곡, 로젠브록 함수, 라스트리긴 함수, 힘멜블라우 함수, 애클리 함수, 안장점 함수, 다중 우물 함수의 기존 9종에 **비틀린 협곡, 부서진 분화구, 단층 미로, 고립된 함정** 4종을 추가해 **총 13종**을 지원합니다. 새로운 4개 맵은 인터랙티브 시안에서 확인한 **복잡도 3단계(최고 복잡도)** 수식을 그대로 사용하며, 복잡도 슬라이더는 별도로 추가하지 않았습니다. 가로·세로축은 두 개의 파라미터, 높이는 손실값입니다. 공은 중력에 따라 굴러가는 것이 아니라 실제 최적화 업데이트 수식에 따라 움직입니다.

## 실행 및 테스트

정적 HTML, CSS, JavaScript로 구성되어 별도 빌드 도구 없이 실행할 수 있습니다.

1. 저장소를 내려받습니다.
2. 프로젝트 루트에서 Python 3의 http.server를 이용해 로컬 서버를 실행합니다. 예시 명령: python -m http.server 8000
3. 브라우저에서 http://localhost:8000 에 접속합니다.
4. 자동 테스트는 Node.js 22 이상에서 npm test 명령으로 실행합니다.

GitHub Actions는 JavaScript 문법 검사와 테스트 성공 후 GitHub Pages에 배포합니다.

## 프로젝트 구조

| 파일 | 역할 |
|---|---|
| src/engine.js | 기본 알고리즘·손실 함수·수치 미분·상태 기록 |
| src/landscapes-complex.js | 비틀린 협곡·부서진 분화구·단층 미로·고립된 함정 |
| src/advanced.js | 적응형·모멘텀·조합형 업데이트 |
| src/second-order.js | 헤시안·준뉴턴·공액기울기 및 선 탐색 |
| src/renderer.js | 2D 등고선 및 3D 손실 지형 |
| src/preview.js | 도감 카드 재생 및 자동 카메라 |
| src/app.js | 화면 구성과 조작·재생·비교 상태 |
| tests/ | 수식·재생·UI 자동 테스트 |

## 정확성과 한계

- 각 단계의 파라미터는 실제 계산 결과이며, 두 단계 사이의 부드러운 화면 이동은 **시각적 보간**입니다.
- 기울기는 유한차분으로 계산합니다. 실제 신경망의 자동 미분 및 미니배치 학습과 차이가 있을 수 있습니다.
- 비교 화면의 학습률은 알고리즘별 기본값을 사용하므로, 결과를 공정한 성능 순위로 받아들이면 안 됩니다.
- 테스트는 결정론과 기본 수치 불변 조건을 점검하지만, 모든 공식 프레임워크와의 출력 일치를 보장하지 않습니다.
- 2차원 시연은 대규모 학습 기법의 원래 목적과 제약을 모두 재현하지 않습니다.

## 참고 자료

- [PyTorch 옵티마이저 문서](https://docs.pytorch.org/docs/main/optim.html)
- [PyTorch RProp 수식](https://docs.pytorch.org/docs/stable/generated/torch.optim.Rprop.html)
- [torch-optimizer 알고리즘 참고](https://pytorch-optimizer.readthedocs.io/en/latest/genindex.html)

## 후속 개발

공식 구현과의 대조 검증, 최적화 계열별 전용 제어판, WebGL 기반 고품질 3D 렌더링, 행렬 옵티마이저 및 실제 신경망 학습 시각화를 검토하고 있습니다.
