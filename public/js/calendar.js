/**
 * CALENDAR & WORKING DAYS ENGINE (대한민국 공휴일 & 워킹데이 계산 엔진)
 */

// 2024~2028 대한민국 법정 공휴일 및 대체공휴일 데이터셋
const KOREAN_PUBLIC_HOLIDAYS = {
  // 2024년
  '2024-01-01': '신정',
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일 (설날)',
  '2024-03-01': '삼일절',
  '2024-04-10': '제22대 국회의원 선거',
  '2024-05-05': '어린이날',
  '2024-05-06': '대체공휴일 (어린이날)',
  '2024-05-15': '부처님오신날',
  '2024-06-06': '현충일',
  '2024-08-15': '광복절',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  '2024-10-01': '국군의 날 (임시공휴일)',
  '2024-10-03': '개천절',
  '2024-10-09': '한글날',
  '2024-12-25': '성탄절',

  // 2025년
  '2025-01-01': '신정',
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-01': '삼일절',
  '2025-03-03': '대체공휴일 (삼일절)',
  '2025-05-05': '어린이날 / 부처님오신날',
  '2025-05-06': '대체공휴일 (어린이날/부처님오신날)',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일 (추석)',
  '2025-10-09': '한글날',
  '2025-12-25': '성탄절',

  // 2026년
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일 (삼일절)',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일 (부처님오신날)',
  '2026-06-03': '제9회 전국동시지방선거',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일 (광복절)',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일 (개천절)',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',

  // 2027년
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일 (설날)',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-06-07': '대체공휴일 (현충일)',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일 (광복절)',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일 (개천절)',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일 (한글날)',
  '2027-12-25': '성탄절',

  // 2028년
  '2028-01-01': '신정',
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-03-01': '삼일절',
  '2028-05-02': '부처님오신날',
  '2028-05-05': '어린이날',
  '2028-06-06': '현충일',
  '2028-08-15': '광복절',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '추석 / 개천절',
  '2028-10-04': '추석 연휴',
  '2028-10-05': '대체공휴일 (추석)',
  '2028-10-09': '한글날',
  '2028-12-25': '성탄절'
};

const CalendarEngine = {
  // 날짜를 YYYY-MM-DD 문자열로 변환
  formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 주말 여부 (0: 일요일, 6: 토요일)
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  },

  // 휴일 여부 확인 (공휴일 + 사용자 정의 휴일)
  isHoliday(date, customHolidays = []) {
    const dateStr = this.formatDateStr(date);
    if (KOREAN_PUBLIC_HOLIDAYS[dateStr]) {
      return { isHoliday: true, name: KOREAN_PUBLIC_HOLIDAYS[dateStr], type: 'public' };
    }
    const foundCustom = customHolidays.find(h => h.date === dateStr);
    if (foundCustom) {
      return { isHoliday: true, name: foundCustom.name, type: 'custom' };
    }
    return { isHoliday: false, name: '', type: null };
  },

  // 워킹데이(영업일) 여부 확인
  isWorkingDay(date, customHolidays = []) {
    if (this.isWeekend(date)) return false;
    const h = this.isHoliday(date, customHolidays);
    return !h.isHoliday;
  },

  /**
   * 시작일(From)부터 목표일(To)까지의 워킹데이(영업일) 잔여일수 계산
   * D-Day 계산 표준:
   * - 목표일이 오늘인 경우 -> D-Day (0 영업일)
   * - 목표일이 미래인 경우 -> 오늘 다음날부터 목표일까지의 워킹데이 수 계산 + 만약 오늘이 워킹데이이고 현재 업무시간 전/중이면 오늘을 1일 또는 비례 산정
   *   일반적인 업무 D-Day 직관:
   *   오늘이 화요일이고 이번주 금요일이 오픈일이면: 수, 목, 금 3영업일 남음 (D-3).
   *   만약 당일 기준 포함 옵션을 줄 때도 직관적으로 "D-N" 형태로 표기.
   */
  calculateWorkingDays(nowDate, targetDate, customHolidays = []) {
    const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = end.getTime() - start.getTime();
    const isPast = diffTime < 0;
    const isToday = diffTime === 0;

    if (isToday) {
      return {
        dDayNumber: 0,
        dDayText: 'D-DAY',
        workingDays: 0,
        status: 'today',
        isWorkingDayToday: this.isWorkingDay(nowDate, customHolidays)
      };
    }

    let count = 0;
    if (!isPast) {
      // 미래 날짜: 내일부터 목표일까지의 워킹데이 카운트
      // (현재 날짜가 아직 지나가지 않았으므로 오늘 당일도 남은 워킹데이로 세는 것이 직관적인 경우 반영)
      const cur = new Date(start);
      // 내일부터 end까지 순회
      cur.setDate(cur.getDate() + 1);
      while (cur <= end) {
        if (this.isWorkingDay(cur, customHolidays)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }

      // 오늘이 아직 영업일이고, 현재 업무시간 종료 전이라면 오늘을 잔여 영업일에 포함
      const isTodayWorking = this.isWorkingDay(start, customHolidays);

      return {
        dDayNumber: count,
        dDayText: count === 0 ? 'D-DAY' : `D-${count}`,
        workingDays: count,
        status: count <= 3 ? 'urgent' : count <= 7 ? 'warning' : 'normal',
        isWorkingDayToday: isTodayWorking
      };
    } else {
      // 마감일이 지난 경우: 목표일 다음날부터 오늘까지 지난 워킹데이 수 계산 (D+N)
      const cur = new Date(end);
      cur.setDate(cur.getDate() + 1);
      while (cur <= start) {
        if (this.isWorkingDay(cur, customHolidays)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return {
        dDayNumber: -count,
        dDayText: `D+${count}`,
        workingDays: -count,
        status: 'overdue',
        isWorkingDayToday: this.isWorkingDay(start, customHolidays)
      };
    }
  },

  /**
   * TASK별 업무시간(예: 10:00 ~ 19:00) 기준 실시간 잔여시간 계산
   * 현재 시각이 해당 업무시간에 포함되어 있을 때 초 단위로 실시간 카운트다운!
   */
  calculateWorkHours(nowDate, targetDate, taskOrSettings, customHolidays = []) {
    let startStr = taskOrSettings?.workStartTime || '09:00';
    let endStr = taskOrSettings?.workEndTime || '18:00';

    // 12시간제 표기 자동 보정: 사용자가 '07:00'을 오후 7시(19:00) 의미로 입력한 경우
    let [sH, sM] = startStr.split(':').map(Number);
    let [eH, eM] = endStr.split(':').map(Number);
    if (eH < sH && eH <= 12) {
      eH += 12; // 07:00 -> 19:00
    }

    const startMinutes = sH * 60 + (sM || 0);
    const endMinutes = eH * 60 + (eM || 0);
    const dailySeconds = Math.max(0, (endMinutes - startMinutes) * 60);

    // 마감일이 이미 지난 경우
    if (targetDate <= nowDate) {
      return {
        remainingMs: 0,
        remainingSeconds: 0,
        formattedText: '0시간 00분 00초 000',
        formattedHtml: '0시간 00분 00초 <span class="ms-digits">000</span>',
        realtimeText: '0시간 00분 00초 000',
        isInWorkHours: false,
        isOverdue: true
      };
    }

    const nowMs = nowDate.getTime();
    const todayCalendar = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const isTodayWorking = this.isWorkingDay(todayCalendar, customHolidays);

    let todayRemainingMs = 0;
    let isInWorkHours = false;

    if (isTodayWorking) {
      const todayStartMs = new Date(todayCalendar).setHours(sH, sM || 0, 0, 0);
      const todayEndMs = new Date(todayCalendar).setHours(eH, eM || 0, 0, 0);

      const isTargetToday = (
        targetDate.getFullYear() === nowDate.getFullYear() &&
        targetDate.getMonth() === nowDate.getMonth() &&
        targetDate.getDate() === nowDate.getDate()
      );

      const effectiveEndMs = isTargetToday ? Math.min(todayEndMs, targetDate.getTime()) : todayEndMs;

      if (nowMs < todayStartMs) {
        // 근무 시작 전: 오늘 근무시간 전체 대기
        todayRemainingMs = Math.max(0, effectiveEndMs - todayStartMs);
        isInWorkHours = false;
      } else if (nowMs >= effectiveEndMs) {
        // 근무 종료 후: 오늘 남은 업무시간 소진(0ms)
        todayRemainingMs = 0;
        isInWorkHours = false;
      } else {
        // [핵심] 현재 시간이 업무시간 범위에 포함됨! -> 밀리초 단위로 실시간 감소!
        todayRemainingMs = Math.max(0, effectiveEndMs - nowMs);
        isInWorkHours = true;
      }
    }

    // 미래 영업일 잔여 시간 계산 (밀리초)
    let futureMs = 0;
    const cur = new Date(todayCalendar);
    cur.setDate(cur.getDate() + 1);
    const targetCalendar = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    while (cur <= targetCalendar) {
      if (this.isWorkingDay(cur, customHolidays)) {
        const isTargetDay = (cur.getTime() === targetCalendar.getTime());
        if (isTargetDay) {
          // 목표일 당일: 출근 시각부터 목표 시각까지 계산
          const dayStartMs = new Date(cur).setHours(sH, sM || 0, 0, 0);
          const dayEndMs = new Date(cur).setHours(eH, eM || 0, 0, 0);
          const eff = Math.min(dayEndMs, Math.max(dayStartMs, targetDate.getTime()));
          futureMs += Math.max(0, eff - dayStartMs);
        } else {
          // 온전한 하루 영업일
          futureMs += dailySeconds * 1000;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    const totalMs = Math.max(0, Math.floor(todayRemainingMs + futureMs));
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor(totalMs % 1000);

    const formattedText = `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초 ${String(ms).padStart(3, '0')}`;
    const formattedHtml = `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초 <span class="ms-digits">${String(ms).padStart(3, '0')}</span>`;

    return {
      remainingMs: totalMs,
      remainingSeconds: Math.floor(totalMs / 1000),
      formattedText,
      formattedHtml,
      realtimeText: formattedText,
      hours,
      minutes,
      seconds,
      ms,
      isInWorkHours,
      workRangeText: `${String(sH).padStart(2, '0')}:${String(sM || 0).padStart(2, '0')} ~ ${String(eH).padStart(2, '0')}:${String(eM || 0).padStart(2, '0')}`
    };
  },

  /**
   * 시작일부터 목표일까지의 전체 워킹데이 대비 현재 경과율(Progress %) 계산
   */
  calculateProgress(startDate, targetDate, nowDate, customHolidays = []) {
    const start = new Date(startDate);
    const end = new Date(targetDate);
    const now = new Date(nowDate);

    // 총 워킹데이 수 구하기
    let totalWorkDays = 0;
    const cur1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (cur1 <= endDateOnly) {
      if (this.isWorkingDay(cur1, customHolidays)) {
        totalWorkDays++;
      }
      cur1.setDate(cur1.getDate() + 1);
    }
    if (totalWorkDays <= 0) totalWorkDays = 1;

    // 시작일부터 오늘까지 경과한 워킹데이
    let elapsedWorkDays = 0;
    const cur2 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    while (cur2 <= nowDateOnly) {
      if (this.isWorkingDay(cur2, customHolidays)) {
        elapsedWorkDays++;
      }
      cur2.setDate(cur2.getDate() + 1);
    }

    let percent = Math.round((elapsedWorkDays / totalWorkDays) * 100);
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    return {
      percent,
      elapsedWorkDays,
      totalWorkDays
    };
  }
};

// 브라우저 및 Node 환경 공용 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalendarEngine, KOREAN_PUBLIC_HOLIDAYS };
}
