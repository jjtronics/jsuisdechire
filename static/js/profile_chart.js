(function () {
  const canvas = document.getElementById('scoreTrendChart');
  if (!canvas) {
    return;
  }

  const wrapper = canvas.closest('[data-chart-wrapper]');
  const container = canvas.parentElement;
  if (!container) {
    if (wrapper) {
      wrapper.classList.add('hidden');
    }
    return;
  }

  const applyStyles = (element, styles) => {
    Object.assign(element.style, styles);
  };

  const parseNumber = (value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const normalized = trimmed.replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const parseTimestamp = (value) => {
    const num = parseNumber(value);
    if (num == null) {
      return null;
    }
    const millis = num > 1e12 ? num : num * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const raw = canvas.getAttribute('data-scores') || '[]';
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    data = [];
  }

  const entries = data
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const score = parseNumber(item.total_score ?? item.score);
      const date = parseTimestamp(item.created_at ?? item.date);
      if (score == null || date == null) {
        return null;
      }
      return {
        score: Math.round(score * 10) / 10,
        date,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  if (!entries.length) {
    if (wrapper) {
      wrapper.classList.add('hidden');
    }
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    if (wrapper) {
      wrapper.classList.add('hidden');
    }
    return;
  }

  const baseStyles = getComputedStyle(wrapper || container || document.body);
  const textColor = baseStyles.color || '#1f2937';
  const primaryColor = '#f43f5e';
  const fillColor = 'rgba(244, 63, 94, 0.12)';
  const gridColor = 'rgba(148, 163, 184, 0.24)';

  const tooltip = document.createElement('div');
  applyStyles(tooltip, {
    position: 'absolute',
    pointerEvents: 'none',
    padding: '6px 10px',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.92)',
    color: '#f8fafc',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.35)',
    transform: 'translate(-50%, -120%)',
    opacity: '0',
    transition: 'opacity 120ms ease',
    zIndex: '2',
    whiteSpace: 'nowrap',
  });
  tooltip.setAttribute('aria-hidden', 'true');
  container.appendChild(tooltip);

  const marker = document.createElement('div');
  applyStyles(marker, {
    position: 'absolute',
    width: '10px',
    height: '10px',
    marginLeft: '-5px',
    marginTop: '-5px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    background: primaryColor,
    boxShadow: '0 6px 16px rgba(244, 63, 94, 0.4)',
    opacity: '0',
    transition: 'opacity 120ms ease',
    pointerEvents: 'none',
    zIndex: '2',
  });
  container.appendChild(marker);

  const guide = document.createElement('div');
  applyStyles(guide, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    width: '1px',
    background: 'rgba(244, 63, 94, 0.35)',
    opacity: '0',
    transition: 'opacity 120ms ease',
    pointerEvents: 'none',
    zIndex: '1',
  });
  container.appendChild(guide);

  const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  const tooltipFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const scores = entries.map((entry) => entry.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const span = maxScore - minScore;
  const padding = span > 0 ? span * 0.1 : Math.max(5, Math.abs(maxScore) * 0.1 || 5);
  const chartMin = minScore - padding;
  const chartMax = maxScore + padding;

  const points = entries.map((entry, index) => ({
    entry,
    label: dayFormatter.format(entry.date),
    tooltip: tooltipFormatter.format(entry.date),
    score: entry.score,
    index,
    x: 0,
    y: 0,
  }));

  const hideTooltip = () => {
    tooltip.style.opacity = '0';
    marker.style.opacity = '0';
    guide.style.opacity = '0';
  };

  const render = () => {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const resolvedWidth =
      canvasRect.width || canvas.clientWidth || containerRect.width || container.clientWidth || 0;
    const resolvedHeight =
      canvasRect.height || canvas.clientHeight || containerRect.height || container.clientHeight || 0;

    const width = Math.max(160, Math.round(resolvedWidth));
    const height = Math.max(140, Math.round(resolvedHeight));
    if (!width || !height) {
      return;
    }

    hideTooltip();

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.reset?.();
    context.scale(dpr, dpr);

    const paddingLeft = 44;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 36;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    if (innerWidth <= 0 || innerHeight <= 0) {
      return;
    }

    context.clearRect(0, 0, width, height);

    context.fillStyle = 'rgba(255, 255, 255, 0.02)';
    context.fillRect(0, 0, width, height);

    const valueRange = chartMax - chartMin || 1;
    const toX = (index) => {
      if (points.length === 1) {
        return paddingLeft + innerWidth / 2;
      }
      return paddingLeft + (innerWidth * index) / (points.length - 1);
    };
    const toY = (value) => {
      const ratio = (value - chartMin) / valueRange;
      return paddingTop + innerHeight * (1 - ratio);
    };

    points.forEach((point) => {
      point.x = toX(point.index);
      point.y = toY(point.score);
    });

    context.strokeStyle = gridColor;
    context.lineWidth = 1;
    context.setLineDash([4, 6]);
    const gridLevels = 4;
    for (let i = 0; i <= gridLevels; i += 1) {
      const ratio = i / gridLevels;
      const y = paddingTop + innerHeight * ratio;
      context.beginPath();
      context.moveTo(paddingLeft, y);
      context.lineTo(width - paddingRight, y);
      context.stroke();
    }
    context.setLineDash([]);

    const valueFormatter = (value) => {
      if (span < 10) {
        return value.toFixed(1);
      }
      return Math.round(value).toString();
    };

    context.fillStyle = textColor;
    context.font = '11px Inter, ui-sans-serif, system-ui, -apple-system';
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let i = 0; i <= gridLevels; i += 1) {
      const ratio = i / gridLevels;
      const value = chartMax - valueRange * ratio;
      const y = paddingTop + innerHeight * ratio;
      context.fillText(valueFormatter(value), paddingLeft - 8, y);
    }

    const bottom = height - paddingBottom + 6;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    const labelSlots = Math.min(points.length, 4);
    for (let i = 0; i < labelSlots; i += 1) {
      const index = labelSlots === 1 ? 0 : Math.round((points.length - 1) * (i / (labelSlots - 1)));
      const point = points[index];
      context.fillText(point.label, point.x, bottom);
    }

    context.beginPath();
    context.moveTo(points[0].x, paddingTop + innerHeight);
    points.forEach((point) => {
      context.lineTo(point.x, point.y);
    });
    context.lineTo(points[points.length - 1].x, paddingTop + innerHeight);
    context.closePath();
    context.fillStyle = fillColor;
    context.fill();

    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.strokeStyle = primaryColor;
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();

    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fillStyle = primaryColor;
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = '#ffffff';
      context.stroke();
    });
  };

  const showPoint = (point) => {
    tooltip.innerHTML = `<div>${point.score.toFixed(1)} pts</div><div style="font-weight: 400; font-size: 11px; opacity: 0.8; margin-top: 2px;">${point.tooltip}</div>`;
    tooltip.style.left = `${point.x}px`;
    tooltip.style.top = `${point.y}px`;
    tooltip.style.opacity = '1';

    marker.style.left = `${point.x}px`;
    marker.style.top = `${point.y}px`;
    marker.style.opacity = '1';

    guide.style.left = `${point.x}px`;
    guide.style.opacity = '1';
  };

  const handlePointer = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    let closest = null;
    let minDistance = Infinity;
    points.forEach((point) => {
      const distance = Math.abs(point.x - x);
      if (distance < minDistance) {
        closest = point;
        minDistance = distance;
      }
    });
    if (closest) {
      showPoint(closest);
    }
  };

  render();

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(render) : null;
  if (resizeObserver) {
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', render);
  }

  container.addEventListener('pointerenter', (event) => {
    handlePointer(event.clientX);
  });
  container.addEventListener('pointermove', (event) => {
    handlePointer(event.clientX);
  });
  container.addEventListener('pointerleave', () => {
    hideTooltip();
  });
  container.addEventListener('touchstart', (event) => {
    const touch = event.touches && event.touches[0];
    if (touch) {
      handlePointer(touch.clientX);
    }
  }, { passive: true });
  container.addEventListener('touchmove', (event) => {
    const touch = event.touches && event.touches[0];
    if (touch) {
      handlePointer(touch.clientX);
    }
  }, { passive: true });
  container.addEventListener('touchend', () => {
    hideTooltip();
  });
  container.addEventListener('touchcancel', () => {
    hideTooltip();
  });
})();
