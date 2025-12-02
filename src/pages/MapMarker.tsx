import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
  IonModal,
  IonInput,
  IonTextarea,
  IonDatetime,
} from '@ionic/react';
import { chevronForward, chevronBack, add, close, checkmark, search } from 'ionicons/icons';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "../utils/supabaseClient";
import '../css/MapMarker.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

type POI = {
  id?: number;
  lat: number;
  lng: number;
  label: string;
  mark_type: string;
  color: string;
  height: number;
  dates?: string[];
  group_name?: string;
  group_index?: number;
};

const MapMarker: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
   const markerRef = useRef<mapboxgl.Marker | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);

  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/streets-v11');
  const [is3D, setIs3D] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(true);
  const [markerCoords, setMarkerCoords] = useState<[number, number] | null>(null);
  const [isAddingMarker, setIsAddingMarker] = useState<boolean>(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [showInputModal, setShowInputModal] = useState<boolean>(false);
  const [markerLabel, setMarkerLabel] = useState<string>('');
  const [markerMarkType, setMarkerMarkType] = useState<string>('');
  const [markerColor, setMarkerColor] = useState<string>('#007cf0');
  const [markerDates, setMarkerDates] = useState<string[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [showMarkersList, setShowMarkersList] = useState<boolean>(false);
  const [selectedViewType, setSelectedViewType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPermanentMarks, setShowPermanentMarks] = useState<boolean>(true);
  const [showGroupMarks, setShowGroupMarks] = useState<boolean>(true);
  const [showDatedMarks, setShowDatedMarks] = useState<boolean>(true);
  const [showOutdatedMarks, setShowOutdatedMarks] = useState<boolean>(false);
  const [markTypeOptions, setMarkTypeOptions] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupColor, setGroupColor] = useState<string>('#007cf0');
  const [groupMarkers, setGroupMarkers] = useState<any[]>([]);
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [datesWithMarks, setDatesWithMarks] = useState<string[]>([]);



  const [cameraState, setCameraState] = useState({
    center: [124.8681005804846, 8.360074137369724] as [number, number],
    zoom: 16,
    pitch: 0,
    bearing: 0,
  });

  const styles = [
    { label: 'Streets', url: 'mapbox://styles/mapbox/streets-v11' },
    { label: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
    { label: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
    { label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
    { label: 'Satellite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  ];

  const enable3D = () => {
    if (!mapRef.current) return;

    if (!mapRef.current.getSource('mapbox-dem')) {
      mapRef.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      mapRef.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
    }

    if (!mapRef.current.getLayer('3d-buildings')) {
      mapRef.current.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6,
        },
      });
    }else {
   
    mapRef.current.setLayoutProperty("3d-buildings", "visibility", "visible");
  }

    mapRef.current.flyTo({
      pitch: 60,
      bearing: -20,
      duration: 2000,
      essential: true,
    });
  };
  

  const disable3D = () => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      pitch: 0,
      bearing: 0,
      duration: 2000,
      essential: true,
    });
      if (mapRef.current.getLayer("3d-buildings")) {
    mapRef.current.setLayoutProperty("3d-buildings", "visibility", "none");
  }
   
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      try {
        setCameraState({
          center: mapRef.current.getCenter().toArray() as [number, number],
          zoom: mapRef.current.getZoom(),
          pitch: mapRef.current.getPitch(),
          bearing: mapRef.current.getBearing(),
        });
        mapRef.current.remove();
      } catch (err) {
        console.warn("Map cleanup failed:", err);
      }
      mapRef.current = null;
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: cameraState.center,
      zoom: cameraState.zoom,
      pitch: cameraState.pitch,
      bearing: cameraState.bearing,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

   

    mapRef.current.on('load', () => {
      mapRef.current?.resize();
      if (is3D) {
        enable3D();
      }
      loadMarkers(); 
      loadMarkTypes(); 
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.warn("Error while removing map:", err);
        }
        mapRef.current = null;
      }
    };
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (is3D) {
      enable3D();
    } else {
      disable3D();
    }
  }, [is3D]);

  useEffect(() => {
    addMarkersToMap(markers);
  }, [selectedViewType, searchQuery, markers, showPermanentMarks, showGroupMarks, showDatedMarks, showOutdatedMarks]);

  useEffect(() => {
    if (mapRef.current) {
      console.log('Search query changed to:', searchQuery);
      addMarkersToMap(markers);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!mapRef.current) return;
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (isAddingMarker) {
        const coords = e.lngLat.toArray() as [number, number];
        setSelectedCoords(coords);
        setShowInputModal(true);
        setIsAddingMarker(false);
      } else if (isAddingGroup) {
        const coords = e.lngLat.toArray() as [number, number];
        setGroupMarkers(prev => [...prev, { coords, index: prev.length + 1 }]);
        new mapboxgl.Marker({ color: groupColor })
          .setLngLat([coords[0], coords[1]])
          .addTo(mapRef.current!);
      }
    };
    if (isAddingMarker || isAddingGroup) {
      mapRef.current.on('click', handleMapClick);
    } else {
      mapRef.current.off('click', handleMapClick);
    }
    return () => {
      if (mapRef.current) mapRef.current.off('click', handleMapClick);
    };
  }, [isAddingMarker, isAddingGroup, groupColor, groupMarkers]);
 const handleAddMarker = () => {
   if (!mapRef.current) return;

   const lngLat = mapRef.current.getCenter();
   if (markerRef.current) {
     markerRef.current.remove();
   }
   markerRef.current = new mapboxgl.Marker({ color: 'red' })
     .setLngLat(lngLat)
     .addTo(mapRef.current);

   setMarkerCoords(lngLat.toArray() as [number, number]);
 };

 const loadMarkers = async () => {
   const { data, error } = await supabase.from('ar_pois').select('id, lat, lng, label, mark_type, color, height, dates, group_name, group_index');
   if (error) {
     console.error('Error loading markers:', error);
   } else {
     setMarkers(data || []);
     addMarkersToMap(data || []);
     
     const allDates = new Set<string>();
     data?.forEach(marker => {
       if (marker.dates && Array.isArray(marker.dates)) {
         marker.dates.forEach(date => allDates.add(date));
       }
     });
     setDatesWithMarks(Array.from(allDates));
   }
 };

 const loadMarkTypes = async () => {
   const { data, error } = await supabase.from('mark_types').select('value, label').order('label');
   if (error) {
     console.error('Error loading mark types:', error);
   } else {
     setMarkTypeOptions(data || []);
   }
 };

 const isMarkOutdated = (marker: any) => {
   if (!marker.dates || marker.dates.length === 0) return false;
   
   const today = new Date().toISOString().split('T')[0]; 
   const latestDate = marker.dates.reduce((latest: string, current: string) => {
     return current > latest ? current : latest;
   }, marker.dates[0]);
   
   return latestDate < today;
 };

 const isDateValid = (date: string) => {
   const today = new Date().toISOString().split('T')[0];
   return date >= today;
 };

 const validateMarkerDates = (dates: string[]) => {
   const invalidDates = dates.filter(date => !isDateValid(date));
   return {
     isValid: invalidDates.length === 0,
     invalidDates: invalidDates
   };
 };

 const getFilteredMarkers = useCallback(() => {
   return markers.filter(marker => {
     const matchesType = selectedViewType === 'all' || marker.mark_type.startsWith(selectedViewType);
     const query = searchQuery.toLowerCase().trim();
     
     const matchesSearch = query === '' ||
       marker.label.toLowerCase().includes(query) ||
       marker.mark_type.toLowerCase().includes(query) ||
       marker.lat.toString().includes(query) ||
       marker.lng.toString().includes(query) ||
       (marker.group_name && marker.group_name.toLowerCase().includes(query)) ||
       (marker.color && marker.color.toLowerCase().includes(query));

     const isGroup = !!marker.group_name;
     const isDated = marker.dates && marker.dates.length > 0 && !isGroup;
     const isPermanent = !marker.dates || marker.dates.length === 0 && !isGroup;
     const isOutdated = isMarkOutdated(marker);

     const matchesCategory = (showGroupMarks && isGroup) ||
                             (showDatedMarks && isDated) ||
                             (showPermanentMarks && isPermanent);

     const matchesOutdatedFilter = showOutdatedMarks || !isOutdated;

     return matchesType && matchesSearch && matchesCategory && matchesOutdatedFilter;
   });
 }, [markers, selectedViewType, searchQuery, showGroupMarks, showDatedMarks, showPermanentMarks, showOutdatedMarks]);

 const filterMarkersByDate = (date: string) => {
   if (!mapRef.current) return;
   markerRefs.current.forEach(marker => marker.remove());
   markerRefs.current = [];
   const filtered = markers.filter(marker => marker.dates && marker.dates.includes(date));
   filtered.forEach(marker => {
     const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${marker.label}</strong><br>Type: ${marker.mark_type}<br>Lat: ${marker.lat}<br>Lng: ${marker.lng}`);
     const mapMarker = new mapboxgl.Marker({ color: marker.color || '#007cf0' })
       .setLngLat([marker.lng, marker.lat])
       .setPopup(popup)
       .addTo(mapRef.current!);
     markerRefs.current.push(mapMarker);
   });
 };

 const addMarkersToMap = (markersData: any[]) => {
   if (!mapRef.current) return;
   markerRefs.current.forEach(marker => marker.remove());
   markerRefs.current = [];
   const filtered = getFilteredMarkers();
   
   if (filtered.length === 0 && searchQuery.trim() !== '') {
     console.log('No markers found for search query:', searchQuery);
   }
   
   filtered.forEach(marker => {
     const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${marker.label}</strong><br>Type: ${marker.mark_type}<br>Lat: ${marker.lat}<br>Lng: ${marker.lng}${marker.group_name ? `<br>Group: ${marker.group_name} #${marker.group_index}` : ''}`);
     let mapMarker;
     if (marker.group_index) {
       const el = document.createElement('div');
       el.style.backgroundColor = marker.color || '#007cf0';
       el.style.width = '30px';
       el.style.height = '30px';
       el.style.borderRadius = '50%';
       el.style.border = '2px solid white';
       el.style.display = 'flex';
       el.style.alignItems = 'center';
       el.style.justifyContent = 'center';
       el.style.fontSize = '12px';
       el.style.fontWeight = 'bold';
       el.style.color = 'white';
       el.textContent = marker.group_index.toString();
       el.setAttribute('aria-label', 'Map marker');
       mapMarker = new mapboxgl.Marker({ element: el })
         .setLngLat([marker.lng, marker.lat])
         .setPopup(popup);
     } else {
       mapMarker = new mapboxgl.Marker({ color: marker.color || '#007cf0' })
         .setLngLat([marker.lng, marker.lat])
         .setPopup(popup);
     }
     mapMarker.addTo(mapRef.current!);
     markerRefs.current.push(mapMarker);
   });
 };


 const handleSaveMarker = async () => {
   if (!selectedCoords || !markerLabel || !markerMarkType) {
     alert('Please fill all fields');
     return;
   }

   if (markerDates.length > 0) {
     const validation = validateMarkerDates(markerDates);
     if (!validation.isValid) {
       alert(`Cannot save marker with outdated dates: ${validation.invalidDates.join(', ')}. Please select today's date or future dates only.`);
       return;
     }
   }

   const { error } = await supabase.from('ar_pois').insert({
     lat: selectedCoords[1],
     lng: selectedCoords[0],
     label: markerLabel,
     mark_type: markerMarkType,
     color: markerColor,
     dates: markerDates,
   });
   if (error) {
     console.error('Error saving marker:', error);
   } else {
     setShowInputModal(false);
     setMarkerLabel('');
     setMarkerMarkType('');
     setMarkerColor('#007cf0');
     setMarkerDates([]);
     setSelectedCoords(null);
     loadMarkers();
   }
 };

 const handleSaveGroup = async () => {
   if (!groupName || groupMarkers.length === 0) {
     alert('Please enter group name and add markers');
     return;
   }

   if (markerDates.length > 0) {
     const validation = validateMarkerDates(markerDates);
     if (!validation.isValid) {
       alert(`Cannot save group with outdated dates: ${validation.invalidDates.join(', ')}. Please select today's date or future dates only.`);
       return;
     }
   }

   const markersToInsert = groupMarkers.map((marker, index) => ({
     lat: marker.coords[1],
     lng: marker.coords[0],
     label: `${groupName} ${index + 1}`,
     mark_type: markerMarkType,
     color: groupColor,
     dates: markerDates,
     group_name: groupName,
     group_index: index + 1,
   }));
   const { error } = await supabase.from('ar_pois').insert(markersToInsert);
   if (error) {
     console.error('Error saving group:', error);
   } else {
     setShowGroupModal(false);
     setGroupName('');
     setGroupColor('#007cf0');
     setGroupMarkers([]);
     setIsAddingGroup(false);
     loadMarkers();
   }
 };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Map Marker</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen scrollY={false}>
        <div className="map-layout">
          <div className="map-wrapper">
            <div ref={mapContainerRef} className="map-container"></div>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '25px',
              padding: '8px 15px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              minWidth: '250px'
            }}>
              <IonIcon icon={search} color="medium" />
              <IonInput
                value={searchQuery}
                placeholder="Search markers..."
                onIonChange={(e) => setSearchQuery(e.detail.value!)}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                onKeyUp={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                style={{
                  width: '180px', 
                  '--placeholder-color': 'var(--ion-color-medium)',
                  '--color': 'var(--ion-color-dark)'
                }}
              />
              {searchQuery && (
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setSearchQuery('')}
                  style={{ '--padding-start': '4px', '--padding-end': '4px' }}
                >
                  <IonIcon icon={close} color="medium" />
                </IonButton>
              )}
            </div>
          </div>

          {/* Toggle button - position changes based on options visibility */}
          <IonButton
            className="slide-toggle-btn"
            onClick={() => setShowOptions(!showOptions)}
            fill="clear"
            style={{
              position: 'absolute',
              left: showOptions ? 'calc(280px + 20px)' : '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
              border: '1px solid rgba(33, 150, 243, 0.1)',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            <IonIcon icon={showOptions ? chevronBack : chevronForward} color="primary" />
          </IonButton>

          {/* Slide Options Container */}
          <div className={`options-wrapper ${showOptions ? "open" : "closed"}`}>
            <div className="options-card">

              {showOptions && (
                <>
                  <IonItem lines="none">
                    <IonLabel>Map Style</IonLabel>
                    <IonSelect
                      value={mapStyle}
                      placeholder="Select Map Layer"
                      onIonChange={(e) => setMapStyle(e.detail.value)}
                    >
                      {styles.map((style) => (
                        <IonSelectOption key={style.url} value={style.url}>
                          {style.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>

                  <IonItem lines="none">
                    <IonLabel>Enable 3D</IonLabel>
                    <IonToggle
                      checked={is3D}
                      onIonChange={(e) => setIs3D(e.detail.checked)}
                    />
                  </IonItem>

                  <IonItem lines="none">
                    <IonLabel>View Type</IonLabel>
                    <IonSelect
                      value={selectedViewType}
                      placeholder="Select view type"
                      onIonChange={(e) => setSelectedViewType(e.detail.value)}
                    >
                      <IonSelectOption value="all">View All</IonSelectOption>
                      <IonSelectOption value="academic">Academic</IonSelectOption>
                      <IonSelectOption value="admin">Administrative</IonSelectOption>
                      <IonSelectOption value="student">Student Facilities</IonSelectOption>
                      <IonSelectOption value="health">Health & Safety</IonSelectOption>
                      <IonSelectOption value="events">Events & Activities</IonSelectOption>
                      <IonSelectOption value="transport">Transport & Access</IonSelectOption>
                      <IonSelectOption value="services">Services</IonSelectOption>
                    </IonSelect>
                  </IonItem>


                  <IonButton expand="block" onClick={() => setIsAddingMarker(!isAddingMarker)}>
                    <IonIcon icon={isAddingMarker ? close : add} slot="start" />
                    {isAddingMarker ? 'Cancel Adding Marker' : 'Add Marker'}
                  </IonButton>
                  {isAddingMarker && <p style={{ textAlign: 'center', color: 'red' }}>Click on the map to place a marker</p>}

                  <IonButton expand="block" onClick={() => setIsAddingGroup(!isAddingGroup)}>
                    <IonIcon icon={isAddingGroup ? close : add} slot="start" />
                    {isAddingGroup ? 'Cancel Adding Group' : 'Add Group'}
                  </IonButton>
                  {isAddingGroup && <p style={{ textAlign: 'center', color: 'red' }}>Click on the map to place group markers</p>}
                  {isAddingGroup && groupMarkers.length > 0 && (
                    <IonButton expand="block" onClick={() => setShowGroupModal(true)}>
                      <IonIcon icon={checkmark} slot="start" />
                      Finish Group ({groupMarkers.length} markers)
                    </IonButton>
                  )}

                  <IonButton expand="block" onClick={() => setShowMarkersList(!showMarkersList)}>
                    <IonIcon icon={showMarkersList ? chevronBack : chevronForward} slot="start" />
                    {showMarkersList ? 'Hide Markers' : 'View All Markers'}
                  </IonButton>

                  <IonItem lines="none">
                    <IonLabel>View Permanent Marks</IonLabel>
                    <IonToggle checked={showPermanentMarks} onIonChange={(e) => setShowPermanentMarks(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>View Group Marks</IonLabel>
                    <IonToggle checked={showGroupMarks} onIonChange={(e) => setShowGroupMarks(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>View Dated Marks</IonLabel>
                    <IonToggle checked={showDatedMarks} onIonChange={(e) => setShowDatedMarks(e.detail.checked)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>Show Outdated Marks</IonLabel>
                    <IonToggle checked={showOutdatedMarks} onIonChange={(e) => setShowOutdatedMarks(e.detail.checked)} />
                  </IonItem>

                  {showMarkersList && (
                    <div className="markers-list">
                      <div style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(0,0,0,0.05)', 
                        borderRadius: '8px', 
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: 'var(--ion-color-medium)'
                      }}>
                        {getFilteredMarkers().length} marker{getFilteredMarkers().length !== 1 ? 's' : ''} found
                        {searchQuery && ` for "${searchQuery}"`}
                      </div>
                      {getFilteredMarkers().length === 0 && searchQuery ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '20px', 
                          color: 'var(--ion-color-medium)',
                          fontSize: '14px'
                        }}>
                          No markers found for "{searchQuery}"
                        </div>
                      ) : (
                        getFilteredMarkers().map(marker => (
                          <div key={marker.id} className="marker-item">
                            <span className="marker-label">{marker.label}</span>
                            <IonButton
                              size="small"
                              onClick={() => {
                                if (mapRef.current) {
                                  mapRef.current.flyTo({
                                    center: [marker.lng, marker.lat],
                                    zoom: 18,
                                    duration: 2000,
                                    essential: true,
                                  });
                                }
                              }}
                            >
                              View
                            </IonButton>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </>
              )}
            </div>
          </div>

          {/* New Container with Calendar */}
          <div className="button-container">
            <div className="builded-card">
              <IonDatetime
                presentation="date"
                value={selectedDate}
                onIonChange={(e) => {
                  const date = e.detail.value as string;
                  setSelectedDate(date);
                  filterMarkersByDate(date);
                }}
                highlightedDates={datesWithMarks.map(date => ({
                  date: date,
                  textColor: '#ffffff',
                  backgroundColor: '#000000'
                }))}
              />
              <div style={{marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textAlign: 'center'}}>
                📅 Black dates have saved markers
              </div>
              <IonButton expand="block" color="danger" onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                addMarkersToMap(markers);
              }}>
                Cancel View
              </IonButton>
            </div>
          </div>

        </div>
      </IonContent>

      <IonModal isOpen={showInputModal} onDidDismiss={() => setShowInputModal(false)} onDidPresent={() => {
        // Focus the label input when modal opens
        setTimeout(() => {
          const input = document.querySelector('ion-input input') as HTMLInputElement;
          if (input) input.focus();
        }, 100);
      }}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Marker</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowInputModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{padding: '10px'}}>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Label</IonLabel>
            <IonInput value={markerLabel} onIonChange={e => setMarkerLabel(e.detail.value!)} placeholder="Enter marker label" />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Mark Type</IonLabel>
            <IonSelect value={markerMarkType} placeholder="Select mark type" onIonChange={e => setMarkerMarkType(e.detail.value!)}>
              {markTypeOptions.map(option => (
                <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Color</IonLabel>
            <input type="color" value={markerColor} onChange={e => setMarkerColor(e.target.value)} style={{width: '100%', height: '40px'}} />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Latitude</IonLabel>
            <IonInput type="number" value={selectedCoords ? selectedCoords[1].toString() : ''} onIonChange={e => {
              const val = parseFloat(e.detail.value!);
              setSelectedCoords(prev => prev ? [prev[0], val] : null);
            }} placeholder="Latitude" />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput type="number" value={selectedCoords ? selectedCoords[0].toString() : ''} onIonChange={e => {
              const val = parseFloat(e.detail.value!);
              setSelectedCoords(prev => prev ? [val, prev[1]] : null);
            }} placeholder="Longitude" />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Dates (Can view past, but only future dates can be saved)</IonLabel>
            <IonDatetime
              presentation="date"
              multiple={true}
              value={markerDates}
              onIonChange={(e) => {
                const dates = e.detail.value as string[];
                setMarkerDates(dates);
              }}
            />
            <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px'}}>
              ⚠️ You can view past dates, but only today's date and future dates can be saved
            </div>
          </IonItem>
          <IonButton expand="full" onClick={handleSaveMarker} color="primary">
            <IonIcon icon={checkmark} slot="start" />
            Done
          </IonButton>
          <IonButton expand="full" onClick={() => setShowInputModal(false)} color="danger">
            <IonIcon icon={close} slot="start" />
            Cancel
          </IonButton>
        </IonContent>
      </IonModal>

      <IonModal isOpen={showGroupModal} onDidDismiss={() => setShowGroupModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Create Group</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowGroupModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{padding: '10px'}}>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Group Name</IonLabel>
            <IonInput value={groupName} onIonChange={e => setGroupName(e.detail.value!)} placeholder="Enter group name" />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Group Color</IonLabel>
            <input type="color" value={groupColor} onChange={e => setGroupColor(e.target.value)} style={{width: '100%', height: '40px'}} />
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Mark Type</IonLabel>
            <IonSelect value={markerMarkType} placeholder="Select mark type" onIonChange={e => setMarkerMarkType(e.detail.value!)}>
              {markTypeOptions.map(option => (
                <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem style={{marginBottom: '10px'}}>
            <IonLabel position="stacked">Dates (Can view past, but only future dates can be saved)</IonLabel>
            <IonDatetime
              presentation="date"
              multiple={true}
              value={markerDates}
              onIonChange={(e) => {
                const dates = e.detail.value as string[];
                setMarkerDates(dates);
              }}
            />
            <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px'}}>
              ⚠️ You can view past dates, but only today's date and future dates can be saved
            </div>
          </IonItem>
          <IonButton expand="full" onClick={handleSaveGroup} color="primary">
            <IonIcon icon={checkmark} slot="start" />
            Save Group
          </IonButton>
          <IonButton expand="full" onClick={() => {
            setShowGroupModal(false);
            setGroupMarkers([]);
            setIsAddingGroup(false);
            // Reload to remove temp markers
            loadMarkers();
          }} color="danger">
            <IonIcon icon={close} slot="start" />
            Cancel
          </IonButton>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default MapMarker;