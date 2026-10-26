
/*
 * 한국 마인크래프트 맵 웹사이트
 * 파일명: detail.js
 *
 * 주요 기능
 * 1. URL에서 맵 코드(KMAP-0001)를 가져오기
 * 2. maps.json에서 해당 맵 검색하기
 * 3. 맵 제목, 제작자, 버전, 설명 표시하기
 * 4. 원작자 블로그 링크 표시하기
 * 5. 우리 웹사이트에 저장된 ZIP 파일 다운로드하기
 */

// ========================================
// 1. HTML에서 맵 상세 정보 표시 영역 가져오기
// ========================================

const detail = document.getElementById('detail');
const status = document.getElementById('status');

// HTML 태그를 안전하게 만드는 함수
function text(tag, value, className = '') {
  const element = document.createElement(tag);

  // textContent를 사용하면 HTML 코드가 실행되지 않아요.
  element.textContent = value ?? '';

  if (className) {
    element.className = className;
  }

  return element;
}

// ========================================
// 2. 외부 인터넷 주소 검사
// ========================================

// 외부 링크는 HTTPS 주소만 허용해요.
function safeHttps(value) {
  try {
    const url = new URL(value);

    if (url.protocol === 'https:') {
      return url.href;
    }

    return null;
  } catch {
    return null;
  }
}

// ========================================
// 3. 다운로드 주소 검사
// ========================================

function safeDownloadUrl(value) {
  // 다운로드 주소가 없으면 사용하지 않아요.
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  // 외부 HTTPS 다운로드 주소인지 확인해요.
  const external = safeHttps(value);

  if (external) {
    return external;
  }

  // 우리 웹사이트의 downloads 폴더에 있는 ZIP 파일인지 검사해요.
  // 예시: ./downloads/KMAP-0001.zip
  const localZipPattern = /^\.\/downloads\/[a-zA-Z0-9_-]+\.zip$/i;

  if (localZipPattern.test(value)) {
    // 상대경로를 실제 다운로드 주소로 변환해요.
    return new URL(value, location.href).href;
  }

  // 허용하지 않는 주소는 차단해요.
  return null;
}

// ========================================
// 4. 외부 링크 버튼 생성
// ========================================

function externalLink(url, label, className = '') {
  const link = text('a', label, className);

  link.href = url;

  // 외부 사이트는 새 탭에서 열어요.
  link.target = '_blank';

  // 새 탭 보안 설정
  link.rel = 'noopener noreferrer';

  return link;
}

// ========================================
// 5. 맵 상세 정보 불러오기
// ========================================

async function init() {

  // 주소에서 id 값을 가져와요.
  // 예시: map.html?id=KMAP-0001
  const code = new URLSearchParams(location.search)
    .get('id')
    ?.trim()
    .toUpperCase();

  // 맵 코드가 없으면 안내 메시지를 표시해요.
  if (!code) {
    status.textContent = '맵 코드가 없습니다. 검색 화면으로 돌아가 주세요.';
    return;
  }

  try {
    // maps.json 파일을 불러와요.
    const response = await fetch('./data/maps.json', {
      cache: 'no-cache'
    });

    // 파일을 불러오지 못했을 때 오류를 표시해요.
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // JSON 데이터를 JavaScript 배열로 변환해요.
    const maps = await response.json();

    if (!Array.isArray(maps)) {
      throw new Error('잘못된 JSON 형식');
    }

    // 입력한 코드와 일치하는 맵을 찾아요.
    const map = maps.find(
      item => String(item.id).toUpperCase() === code
    );

    if (!map) {
      status.textContent = '해당 맵을 찾을 수 없습니다.';
      return;
    }

    // ========================================
    // 6. 맵 제목과 코드 표시
    // ========================================

    document.title = `${map.title} | Korea Minecraft Maps`;

    detail.append(
      text('h2', map.title),
      text('p', `맵 코드: ${map.id}`, 'meta')
    );

  
    // ========================================
    // 7. 맵 미리보기 이미지 슬라이드
    // ========================================

    // 여러 장의 이미지를 가져와요.
    // 기존 imageUrl 형식도 지원해요.
    const imagePaths = Array.isArray(map.imageUrls)
      ? map.imageUrls
      : (map.imageUrl ? [map.imageUrl] : []);

    // 이미지 주소를 안전하게 검사해요.
    const imageUrls = imagePaths
      .map(path => {
        // 외부 HTTPS 이미지 주소 허용
        const external = safeHttps(path);
        if (external) return external;

        // 우리 웹사이트 images 폴더의 이미지 허용
        if (
          typeof path === 'string' &&
          /^\.\/images\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/i.test(path)
        ) {
          return new URL(path, location.href).href;
        }

        return null;
      })
      .filter(Boolean);

    if (imageUrls.length > 0) {

      // 슬라이드 전체를 감싸는 영역
      const slider = document.createElement('div');
      slider.className = 'map-slider';

      // 현재 보고 있는 이미지 번호
      let currentIndex = 0;

      // 화면에 표시할 이미지
      const image = document.createElement('img');
      image.className = 'preview';
      image.alt = `${map.title} 미리보기 1`;
      image.loading = 'lazy';

      // 이전 이미지 버튼
      const prevButton = text('button', '❮', 'slider-prev');
      prevButton.type = 'button';
      prevButton.setAttribute('aria-label', '이전 이미지');

      // 다음 이미지 버튼
      const nextButton = text('button', '❯', 'slider-next');
      nextButton.type = 'button';
      nextButton.setAttribute('aria-label', '다음 이미지');

      // 현재 이미지 번호 표시
      const counter = text('p', '', 'slider-counter');

      // 이미지가 변경될 때 실행하는 함수
      function showSlide(index) {
        currentIndex =
          (index + imageUrls.length) % imageUrls.length;

        image.src = imageUrls[currentIndex];
        image.alt = `${map.title} 미리보기 ${currentIndex + 1}`;

        counter.textContent =
          `${currentIndex + 1} / ${imageUrls.length}`;
      }

      // 이전 버튼을 누르면 이전 이미지 표시
      prevButton.addEventListener('click', () => {
        showSlide(currentIndex - 1);
      });

      // 다음 버튼을 누르면 다음 이미지 표시
      nextButton.addEventListener('click', () => {
        showSlide(currentIndex + 1);
      });

      // 슬라이드에 요소 추가
      slider.append(image);

      // 이미지가 2장 이상일 때만 버튼 표시
      if (imageUrls.length > 1) {
        slider.append(prevButton, nextButton, counter);
      }

      // 상세 페이지에 슬라이드 추가
      detail.append(slider);

      // 첫 번째 이미지부터 표시
      showSlide(0);

    } else {
      detail.append(
        text('p', '등록된 미리보기 이미지가 없습니다.', 'placeholder')
      );
    }


    // ========================================
    // 8. 제작자, 버전, 이용 조건 표시
    // ========================================

    const fields = [
      ['제작자', map.creator],
      ['에디션', map.edition],
      ['마인크래프트 버전', map.minecraftVersion],
      ['이용 조건', map.license || '확인되지 않음']
    ];

    const list = document.createElement('dl');
    list.className = 'facts';

    for (const [label, value] of fields) {
      list.append(
        text('dt', label),
        text('dd', value || '미등록')
      );
    }

    detail.append(list);

    // ========================================
    // 9. 맵 소개 표시
    // ========================================

    detail.append(
      text('h3', '맵 소개'),
      text('p', map.description || '소개가 없습니다.')
    );

    // ========================================
    // 10. 원작자 블로그 링크 표시
    // ========================================

    const source = safeHttps(map.sourceUrl);

    if (source) {
      detail.append(
        externalLink(
          source,
          '제작자 원본 게시글 보기',
          'secondary-link'
        )
      );
    }

    // ========================================
    // 11. 다운로드 버튼 만들기
    // ========================================

    // maps.json의 downloadUrl 값을 읽어와요.
    const download = safeDownloadUrl(map.downloadUrl);

    detail.append(
      text('h3', '다운로드')
    );

    if (download) {

      // 우리 웹사이트에 저장된 ZIP 파일인지 확인해요.
      const isLocalFile =
        map.downloadUrl.startsWith('./downloads/');

      if (isLocalFile) {

        // ZIP 파일 직접 다운로드 버튼
        const link = text(
          'a',
          '맵 ZIP 파일 다운로드',
          'download'
        );

        // 실제 ZIP 파일 주소를 연결해요.
        link.href = download;

        // 다운로드할 때 사용할 파일 이름
        link.download = map.id + '.zip';

        detail.append(link);

        detail.append(
          text(
            'p',
            '제작자의 재배포 허가를 받은 맵 파일입니다.',
            'meta'
          )
        );

      } else {

        // 외부 다운로드 사이트로 이동하는 버튼
        detail.append(
          externalLink(
            download,
            '외부 다운로드 페이지 열기',
            'download'
          )
        );
      }

    } else {

      // 다운로드 주소가 등록되지 않은 경우
      detail.append(
        text(
          'p',
          '현재 다운로드 링크가 등록되지 않았습니다.',
          'placeholder'
        )
      );
    }

    // ========================================
    // 12. 맵 정보 표시 완료
    // ========================================

    status.textContent = '맵 정보를 불러왔습니다.';

    // 숨겨진 상세 정보 영역을 화면에 표시해요.
    detail.hidden = false;

  } catch (error) {

    // 오류가 발생하면 개발자 콘솔에 기록해요.
    console.error(error);

    status.textContent =
      '맵 데이터를 읽지 못했습니다. Live Server와 JSON 파일을 확인해 주세요.';
  }
}

// ========================================
// 13. 페이지가 열리면 실행
// ========================================

init();
