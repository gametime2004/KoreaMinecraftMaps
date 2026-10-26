
// ========================================
// 한국 마인크래프트 맵 웹사이트
// 메인 페이지 검색 및 맵 카드 관리
// ========================================

// 앱과 웹사이트가 공통으로 사용할 맵 목록
let maps = [];

// 기존 맵 코드 검색 영역
const form = document.getElementById('searchForm');
const input = document.getElementById('mapCode');
const status = document.getElementById('status');
const result = document.getElementById('result');

// 새로 추가한 실시간 검색 및 필터 영역
const mapGrid = document.getElementById('mapGrid');
const mapSearch = document.getElementById('mapSearch');
const editionFilter = document.getElementById('editionFilter');
const mapCount = document.getElementById('mapCount');

// ========================================
// 1. HTML 요소를 안전하게 만드는 함수
// ========================================

function addText(parent, tag, value, className = '') {
  const element = document.createElement(tag);

  // 외부 데이터를 HTML 코드로 실행하지 않고 글자로 표시해요.
  element.textContent = value ?? '';

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);
  return element;
}

// ========================================
// 2. 맵 코드 검색 결과 표시
// ========================================

function showMap(map) {
  result.replaceChildren();
  result.hidden = false;

  addText(result, 'h2', map.title);
  addText(result, 'p', `코드: ${map.id}`, 'meta');

  addText(
    result,
    'p',
    `제작자: ${map.creator || '미등록'} · 에디션: ${map.edition} · 버전: ${map.minecraftVersion}`,
    'meta'
  );

  addText(
    result,
    'p',
    map.description || '맵 설명이 없습니다.'
  );

  // 상세 페이지로 이동하는 링크를 만들어요.
  const detailLink = addText(
    result,
    'a',
    '상세 정보 및 다운로드 보기',
    'download'
  );

  detailLink.href =
    'map.html?id=' + encodeURIComponent(map.id);

  // 직접 다운로드와 외부 다운로드는 상세 페이지에서 처리해요.
  // 따라서 메인 화면에서는 다운로드 여부를 임의로 판단하지 않아요.
}

// ========================================
// 3. 썸네일 이미지 주소 검사
// ========================================

function getCardImageUrl(map) {

  // 여러 장의 이미지가 있다면 첫 번째 이미지를 사용해요.
  const path = Array.isArray(map.imageUrls)
    ? map.imageUrls[0]
    : map.imageUrl;

  if (typeof path !== 'string' || !path.trim()) {
    return null;
  }

  // 웹사이트 내부 images 폴더의 이미지인지 확인해요.
  const localImagePattern =
    /^\.\/images\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/i;

  if (localImagePattern.test(path)) {
    return new URL(path, location.href).href;
  }

  // 외부 이미지는 HTTPS 주소만 허용해요.
  try {
    const url = new URL(path);

    if (url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    // 올바르지 않은 주소는 사용하지 않아요.
  }

  return null;
}

// ========================================
// 4. 맵 카드 만들기
// ========================================

function createMapCard(map) {

  // 카드 전체를 클릭하면 상세 페이지로 이동해요.
  const card = document.createElement('a');
  card.className = 'map-card';

  card.href =
    'map.html?id=' + encodeURIComponent(map.id);

  // 썸네일 영역 생성
  const thumbnail = document.createElement('div');
  thumbnail.className = 'map-card-thumbnail';

  const imageUrl = getCardImageUrl(map);

  if (imageUrl) {
    const image = document.createElement('img');

    image.src = imageUrl;
    image.alt = `${map.title} 썸네일`;
    image.loading = 'lazy';

    thumbnail.appendChild(image);
  } else {
    // 이미지가 없는 맵은 안내 문구를 표시해요.
    const placeholder = document.createElement('span');
    placeholder.textContent = '이미지 준비 중';

    thumbnail.appendChild(placeholder);
  }

  // 맵 정보 영역 생성
  const info = document.createElement('div');
  info.className = 'map-card-info';

  const title = document.createElement('h3');
  title.textContent = map.title || '이름 없는 맵';

  const creator = document.createElement('p');
  creator.textContent =
    '제작자: ' + (map.creator || '미등록');

  const version = document.createElement('p');
  version.className = 'map-card-version';

  version.textContent =
    (map.edition || '에디션 미등록') +
    ' · ' +
    (map.minecraftVersion || '버전 미등록');

  // 맵 정보를 카드에 추가해요.
  info.append(title, creator, version);
  card.append(thumbnail, info);

  return card;
}

// ========================================
// 5. 검색어와 에디션에 맞는 맵 찾기
// ========================================

function getFilteredMaps() {

  // 검색어 양쪽의 공백을 제거하고 소문자로 변환해요.
  const keyword = (mapSearch?.value || '')
    .trim()
    .toLowerCase();

  // 선택된 에디션을 가져와요.
  const selectedEdition = editionFilter?.value || 'all';

  return maps.filter(map => {

    // 검색 대상: 맵 코드, 이름, 제작자, 버전, 설명
    const searchText = [
      map.id,
      map.title,
      map.creator,
      map.minecraftVersion,
      map.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // 검색어가 포함되어 있는지 확인해요.
    const matchesKeyword =
      keyword === '' || searchText.includes(keyword);

    // 선택한 에디션과 일치하는지 확인해요.
    const matchesEdition =
      selectedEdition === 'all' ||
      String(map.edition).toLowerCase() ===
        selectedEdition.toLowerCase();

    // 검색어와 에디션 조건을 모두 만족해야 해요.
    return matchesKeyword && matchesEdition;
  });
}

// ========================================
// 6. 검색 결과를 맵 카드로 표시
// ========================================

function renderMapCards() {

  if (!mapGrid) return;

  // 검색 조건에 맞는 맵만 가져와요.
  const filteredMaps = getFilteredMaps();

  // 이전 카드들을 삭제해요.
  mapGrid.replaceChildren();

  // 검색 결과 개수를 표시해요.
  if (mapCount) {
    mapCount.textContent =
      `전체 ${maps.length}개 중 ${filteredMaps.length}개 표시`;
  }

  // 검색 결과가 없다면 안내 문구를 표시해요.
  if (filteredMaps.length === 0) {
    addText(
      mapGrid,
      'p',
      '검색 조건에 맞는 마인크래프트 맵이 없습니다.',
      'placeholder'
    );
    return;
  }

  // 검색된 맵을 카드로 만들어 표시해요.
  for (const map of filteredMaps) {
    mapGrid.appendChild(createMapCard(map));
  }
}

// ========================================
// 7. maps.json 데이터 불러오기
// ========================================

async function loadMaps() {
  try {

    // 맵 데이터 파일을 읽어와요.
    const response = await fetch('./data/maps.json', {
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('맵 데이터 형식이 올바르지 않습니다.');
    }

    // 불러온 맵을 저장해요.
    maps = data;

    // 맵 카드 목록을 표시해요.
    renderMapCards();

    status.textContent =
      `맵 ${maps.length}개를 불러왔습니다.`;

    // 주소에 ?code=KMAP-0001이 있다면 자동 검색해요.
    const initialCode =
      new URLSearchParams(location.search).get('code');

    if (initialCode && form && input) {
      input.value = initialCode;
      form.requestSubmit();
    }

  } catch (error) {
    console.error(error);

    status.textContent =
      '맵 정보를 불러오지 못했습니다. Live Server와 maps.json을 확인해 주세요.';

    if (mapCount) {
      mapCount.textContent = '맵 목록을 불러오지 못했습니다.';
    }
  }
}

// ========================================
// 8. 기존 맵 코드 검색 기능
// ========================================

if (form && input && result) {
  form.addEventListener('submit', event => {

    // 검색할 때 페이지가 새로고침되지 않도록 해요.
    event.preventDefault();

    const code = input.value.trim().toUpperCase();

    // 입력한 코드와 정확히 일치하는 맵을 찾아요.
    const map = maps.find(
      item => String(item.id).toUpperCase() === code
    );

    if (!map) {
      result.hidden = true;
      status.textContent =
        `‘${code}’에 해당하는 맵이 없습니다.`;
      return;
    }

    status.textContent = '맵을 찾았습니다.';
    showMap(map);
  });
}

// ========================================
// 9. 실시간 검색 이벤트
// ========================================

// 글자를 입력할 때마다 맵 목록을 갱신해요.
if (mapSearch) {
  mapSearch.addEventListener('input', renderMapCards);
}

// Java / Bedrock 선택이 바뀌면 목록을 갱신해요.
if (editionFilter) {
  editionFilter.addEventListener('change', renderMapCards);
}

// ========================================
// 10. 웹사이트 시작
// ========================================

loadMaps();
