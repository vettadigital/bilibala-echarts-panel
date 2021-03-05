import React, { useRef, useState, useEffect } from 'react';
import { PanelProps, GrafanaTheme } from '@grafana/data';
import { withTheme } from '@grafana/ui';
import { debounce } from 'lodash';
import * as echarts from 'echarts';
import { css, cx } from 'emotion';
import { SimpleOptions, funcParams } from 'types';

// just comment it if don't need it
import 'echarts-wordcloud';
import 'echarts-liquidfill';
import 'echarts-gl';

// auto register map
const maps = (require as any).context('./map', false, /\.json/);
maps.keys().map((m: string) => {
  const matched = m.match(/\.\/([0-9a-zA-Z_]*)\.json/);
  if (matched) {
    echarts.registerMap(matched[1], maps(m));
  } else {
    console.warn(
      "Can't register map: JSON file Should be named according to the following rules: /([0-9a-zA-Z_]*).json/."
    );
  }
});

const getStyles = () => ({
  tips: css`
    padding: 0 10%;
    height: 100%;
    background: rgba(128, 128, 128, 0.1);
    overflow: auto;
  `,
  tipsTitle: css`
    margin: 48px 0 32px;
    text-align: center;
  `,
  wrapper: css`
    position: relative;
  `,
});

interface Props extends PanelProps<SimpleOptions> {
  theme: GrafanaTheme;
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const DAYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
];

const setXAxisData = (scale: string, resample: string) => {
  const WEEKS = [] as string[];
  for (let week = 1; week <= (scale === 'y' ? 53 : 5); week++) {
    WEEKS.push(`${week}ª`);
  }
  switch (scale) {
    case 'y':
      if (resample === '30d') return MONTHS;
      if (resample === '1w') return WEEKS;
      break;
    case 'M':
      if (resample === '1w') return WEEKS;
      if (resample === '1d') return DAYS;
      break;
  }
  return [] as string[];
};

const PartialSimplePanel: React.FC<Props> = ({ options, replaceVariables, data, width, height, theme }) => {
  const styles = getStyles();
  const echartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<echarts.ECharts>();
  const [tips, setTips] = useState<Error | undefined>();

  const scale = replaceVariables('$scale');
  const resample = replaceVariables('$resample');

  const xAxisData = setXAxisData(scale, resample);

  const resetOption = debounce(
    () => {
      if (!chart) {
        return;
      }
      if (data.state && data.state !== 'Done') {
        return;
      }
      try {
        setTips(undefined);
        chart.clear();
        let getOption = new Function(funcParams, options.getOption);
        const o = getOption(data, theme, chart, echarts, xAxisData);
        o && chart.setOption(o);
      } catch (err) {
        console.error('Editor content error!', err);
        setTips(err);
      }
    },
    150,
    { leading: true }
  );

  useEffect(() => {
    if (echartRef.current) {
      chart?.clear();
      chart?.dispose();
      setChart(echarts.init(echartRef.current, options.followTheme ? theme.type : undefined));
    }

    return () => {
      chart?.clear();
      chart?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echartRef.current, options.followTheme]);

  useEffect(() => {
    chart?.resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    chart && resetOption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, options.getOption, data]);

  return (
    <>
      {tips && (
        <div className={styles.tips}>
          <h5 className={styles.tipsTitle}>Editor content error!</h5>
          {(tips.stack || tips.message).split('\n').map(s => (
            <p>{s}</p>
          ))}
        </div>
      )}
      <div
        ref={echartRef}
        className={cx(
          styles.wrapper,
          css`
            width: ${width}px;
            height: ${height}px;
          `
        )}
      />
    </>
  );
};

export const SimplePanel = withTheme(PartialSimplePanel);
