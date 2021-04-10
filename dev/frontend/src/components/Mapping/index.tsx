import { Button, Grid, makeStyles, MenuItem, Select } from '@material-ui/core';
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Loader } from 'google-maps';
import { sample, shuffle } from 'lodash';
import { useSnackbar } from 'notistack';
import io from 'socket.io-client';

import { Route } from '../../interfaces/Route';
import { getCurrentPosition } from '../../utils/geolocation';
import { makeCarIcon, makeMarkerIcon, Map } from '../../utils/maps';
import { RouteExistsError } from '../../errors/route-exists.error';
import classes from '*.module.css';
import { Navbar } from '../Navbar';

// import { Container } from './styles';

const API_URL = process.env.REACT_APP_API_URL as string;

const googleMapsLoader = new Loader(process.env.REACT_APP_GOOGLE_API_KEY);

const colors = [
  '#b71c1c',
  '#4a148c',
  '#2e7d32',
  '#e65100',
  '#2962ff',
  '#c2185b',
  '#FFCD00',
  '#3e2723',
  '#03a9f4',
  '#827717',
];

const useStyles = makeStyles({
  root: {
    width: '100%',
    height: '100%',
  },
  form: {
    margin: '16px',
  },
  btnSubmitWrapper: {
    textAlign: 'center',
    marginTop: '8px',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

const Mapping: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeIdSelected, setRouteIdSelected] = useState<string>('');
  const mapRef = useRef<Map>();
  const socketIORef = useRef<SocketIOClient.Socket>();
  const { enqueueSnackbar } = useSnackbar();
  const styles = useStyles();

  const finishRoute = useCallback((route: Route) => {
    enqueueSnackbar(`${route.title} finalizou!`, { variant: 'success' });
    mapRef.current?.removeRoute(route._id);
  }, []);

  useEffect(() => {
    if (!socketIORef.current?.connected) {
      socketIORef.current = io.connect(API_URL);
      socketIORef.current.on('connect', () => console.log('conectou'));
    }

    const handleNewPosition = (data: {
      routeId: string;
      position: [number, number];
      finished: boolean;
    }) => {
      const [lat, lng] = data.position;
      mapRef.current?.moveCurrentMarker(data.routeId, { lat, lng });

      const route = routes.find((route) => route._id === data.routeId) as Route;

      if (data.finished) {
        finishRoute(route);
      }
    };

    socketIORef.current?.on('new-position', handleNewPosition);

    return () => {
      socketIORef?.current?.off('new-position', handleNewPosition);
    };
  }, [finishRoute, routes, routeIdSelected]);

  useEffect(() => {
    fetch(`${API_URL}/routes`)
      .then((data) => data.json())
      .then((data) => setRoutes(data));
  }, []);

  useEffect(() => {
    (async () => {
      const [, position] = await Promise.all([
        googleMapsLoader.load(),
        getCurrentPosition({ enableHighAccuracy: true }),
      ]);

      const divMap = document.getElementById('map') as HTMLElement;
      mapRef.current = new Map(divMap, {
        zoom: 15,
        center: position,
      });

      console.log('position', position);
    })();
  }, []);

  const startRoute = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      const route = routes.find((route) => route._id === routeIdSelected);
      const color = sample(shuffle(colors)) as string;

      try {
        mapRef.current?.addRoute(routeIdSelected, {
          currentMarkerOptions: {
            position: route?.startPosition,
            icon: makeCarIcon(color),
          },
          endMarkerOptions: {
            position: route?.endPosition,
            icon: makeMarkerIcon(color),
          },
        });

        socketIORef.current?.emit('new-direction', {
          routeId: routeIdSelected,
        });
      } catch (error) {
        if (error instanceof RouteExistsError) {
          enqueueSnackbar(`${route?.title} já adicionado, espere finalizar.`);
          return;
        }
        throw error;
      }

      console.log(routeIdSelected);
    },
    [routeIdSelected, routes, enqueueSnackbar],
  );

  return (
    <Grid container className={styles.root}>
      <Grid item xs={12} sm={3}>
        <Navbar />
        <form onSubmit={startRoute} className={styles.form}>
          <Select
            fullWidth
            displayEmpty
            value={routeIdSelected}
            onChange={(e) => setRouteIdSelected(String(e.target.value))}
          >
            <MenuItem value="">
              <em>Selecione uma corrida</em>
            </MenuItem>
            {routes.map((route) => (
              <MenuItem key={`route_${route._id}`} value={route._id}>
                {route.title}
              </MenuItem>
            ))}
          </Select>
          <div className={styles.btnSubmitWrapper}>
            <Button type="submit" color="primary" variant="contained">
              Iniciar uma corrida
            </Button>
          </div>
        </form>
      </Grid>
      <Grid item xs={12} sm={9}>
        <div id="map" className={styles.map} />
      </Grid>
    </Grid>
  );
};

export default Mapping;
