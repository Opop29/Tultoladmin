import React, { useEffect, useState, useRef } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonDatetime, IonModal, IonInput, IonSelect, IonSelectOption, IonIcon, IonButton, IonItem, IonLabel } from "@ionic/react";
import { checkmark, close } from 'ionicons/icons';
import mapboxgl from 'mapbox-gl';
import { supabase } from "../utils/supabaseClient";
import "../css/Builded.css";

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
  editing?: boolean;
};

type GroupItem = {
  isGroup: true;
  group_name: string;
  group_index: number;
  color: string;
  mark_type: string;
  markers: POI[];
  lat: number;
  lng: number;
  height: number;
  editing?: boolean;
};

type DisplayItem = POI | GroupItem;

const Builded: React.FC = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [selected, setSelected] = useState<POI | GroupItem | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());
  const [mapLocation, setMapLocation] = useState<POI | GroupItem | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newMarkerLabel, setNewMarkerLabel] = useState<string>('');
  const [newMarkerMarkType, setNewMarkerMarkType] = useState<string>('');
  const [newMarkerColor, setNewMarkerColor] = useState<string>('#007cf0');
  const [newMarkerLat, setNewMarkerLat] = useState<string>('');
  const [newMarkerLng, setNewMarkerLng] = useState<string>('');
  const [showPermanentMarks, setShowPermanentMarks] = useState<boolean>(true);
  const [showGroupMarks, setShowGroupMarks] = useState<boolean>(true);
  const [showDatedMarks, setShowDatedMarks] = useState<boolean>(true);
  const [markTypeOptions, setMarkTypeOptions] = useState<any[]>([]);
  const [showCalendarView, setShowCalendarView] = useState<boolean>(false);
  const [selectedDateMarkers, setSelectedDateMarkers] = useState<POI[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'group' | 'selected' | 'all';
    item?: POI | GroupItem;
    count?: number;
  }>({ isOpen: false, type: 'single' });
  const [isDeleting, setIsDeleting] = useState(false);

  const isOutdated = (poi: POI): boolean => {
    if (!poi.dates || poi.dates.length === 0) return false;
    const today = new Date().toISOString().split('T')[0];
    return poi.dates.some(d => d < today);
  };

  const getFilteredPois = (): DisplayItem[] => {
    const filtered = pois.filter(p => {
      if (!showPermanentMarks && !p.dates?.length) return false;
      if (!showGroupMarks && p.group_name) return false;
      if (!showDatedMarks && p.dates?.length) return false;
      return true;
    });

    const grouped = new Map<string, POI[]>();
    const individual: POI[] = [];

    filtered.forEach(p => {
      if (p.group_name) {
        const baseName = p.group_name.replace(/ #\d+$/, '');
        if (!grouped.has(baseName)) {
          grouped.set(baseName, []);
        }
        grouped.get(baseName)!.push(p);
      } else {
        individual.push(p);
      }
    });
    const groupItems: GroupItem[] = Array.from(grouped.entries()).map(([baseName, group]) => ({
      isGroup: true,
      group_name: baseName,
      group_index: 0,
      color: group[0].color,
      mark_type: group[0].mark_type,
      markers: group,
      lat: group[0].lat,
      lng: group[0].lng,
      height: group[0].height
    }));

    return [...groupItems, ...individual];
  };

  useEffect(() => {
    fetchPois();
    loadMarkTypes();
  }, []);

  const loadMarkTypes = async () => {
    const { data, error } = await supabase.from('mark_types').select('value, label').order('label');
    if (error) {
      console.error('Error loading mark types:', error);
    } else {
      setMarkTypeOptions(data || []);
    }
  };

  useEffect(() => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    if (mapLocation && mapContainer.current) {
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [mapLocation.lng, mapLocation.lat],
        zoom: 15
      });

      if ('isGroup' in mapLocation && mapLocation.isGroup) {
      
        const groupItem = mapLocation as unknown as GroupItem;
        groupItem.markers.forEach((marker: POI, index: number) => {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${marker.label}</strong><br>Lat: ${marker.lat}<br>Lng: ${marker.lng}<br>Group: ${groupItem.group_name}`);

          const el = document.createElement('div');
          el.style.backgroundColor = groupItem.color || '#007cf0';
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
          el.textContent = (index + 1).toString(); 
          el.setAttribute('aria-label', 'Map marker');

          new mapboxgl.Marker({ element: el })
            .setLngLat([marker.lng, marker.lat])
            .setPopup(popup)
            .addTo(map.current!);
        });
      } else if (!('isGroup' in mapLocation) || !mapLocation.isGroup) {
       
        const marker = mapLocation as POI;
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${marker.label}</strong><br>Lat: ${marker.lat}<br>Lng: ${marker.lng}${marker.group_name ? `<br>Group: ${marker.group_name}` : ''}`);

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
          new mapboxgl.Marker({ element: el })
            .setLngLat([marker.lng, marker.lat])
            .setPopup(popup)
            .addTo(map.current);
        } else {
          new mapboxgl.Marker({ color: marker.color || '#007cf0' })
            .setLngLat([marker.lng, marker.lat])
            .setPopup(popup)
            .addTo(map.current);
        }
      }
    }
  }, [mapLocation]);

  async function fetchPois() {
    const { data, error } = await supabase
      .from("ar_pois")
      .select("id, lat, lng, label, mark_type, color, height, dates, group_name, group_index");
    if (error) {
      console.error('Error fetching POIs:', error);
      return;
    }
    console.log('Fetched POIs:', data?.length || 0, 'markers');
    setPois((data as POI[]) || []);
  }

  async function updatePoi(p: POI) {
   if (!p.id) {
     console.error('No ID provided for update');
     alert('Cannot save: Marker has no ID');
     return;
   }
   console.log('Saving marker ID:', p.id, 'Type:', typeof p.id);
   console.log('Update data:', {
     label: p.label,
     mark_type: p.mark_type,
     color: p.color,
     height: p.height,
     lat: p.lat,
     lng: p.lng,
   });
   try {
     const { data, error } = await supabase
       .from("ar_pois")
       .update({
         label: p.label,
         mark_type: p.mark_type,
         color: p.color,
         height: p.height,
         lat: p.lat,
         lng: p.lng,
       })
       .eq("id", p.id)
       .select();

     if (error) {
       console.error('Supabase error updating marker:', error);
       alert('Failed to save changes: ' + error.message);
       return;
     }

     console.log('Update response data:', data);
     if (!data || data.length === 0) {
       console.warn('No rows were updated. Marker may not exist or ID mismatch.');
       alert('Warning: No changes were made. Please check if the marker exists.');
       return;
     }

     console.log('Marker updated successfully, rows affected:', data.length);
     alert('Changes saved successfully!');
     fetchPois();
     setSelected(null);
   } catch (err) {
     console.error('Update failed with exception:', err);
     alert('Failed to save changes. Please try again.');
   }
 }

  async function setCoords(p: POI) {
    if (!p.id) return;
    const lat = prompt("Set latitude:", p.lat.toString());
    const lon = prompt("Set longitude:", p.lng.toString());
    if (!lat || !lon) return;
    await supabase
      .from("ar_pois")
      .update({ lat: Number(lat), lng: Number(lon) })
      .eq("id", p.id);
    fetchPois();
  }

  async function deletePoi(p: POI) {
    console.log('deletePoi called with:', p);
    if (!p.id) {
      console.error('No ID provided for deletion');
      return;
    }

    try {
      console.log('Attempting to delete marker with ID:', p.id, 'Label:', p.label);

      const { data, error } = await supabase
        .from("ar_pois")
        .delete()
        .eq("id", p.id)
        .select(); 

      console.log('Supabase delete response - data:', data, 'error:', error);

      if (error) {
        console.error('Supabase error deleting marker:', error);
        alert(`Failed to delete marker: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        console.log('Marker deleted successfully:', data[0]);
      } else {
        console.warn('No marker was deleted - marker may not exist');
      }

      console.log('Refreshing POI list...');
      await fetchPois();
      setSelected(null);
      setMapLocation(null);
      console.log('Delete operation completed');

    
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Delete operation failed with exception:', err);
      alert('Failed to delete marker. Please check console for details.');
    }
  }


  useEffect(() => {
    if (selectAll) {
      const allIds: number[] = [];
      getFilteredPois().forEach(item => {
        if ('isGroup' in item) {
          item.markers.forEach(m => allIds.push(m.id!));
        } else {
          allIds.push(item.id!);
        }
      });
      setCheckedIds(allIds);
    } else {
      setCheckedIds([]);
    }
  }, [selectAll, pois, showPermanentMarks, showGroupMarks, showDatedMarks]);

  const handleCheck = (id: number) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  const handleDeleteClick = (type: 'single' | 'group' | 'selected' | 'all', item?: POI | GroupItem, count?: number) => {
    console.log('Delete clicked:', type, item ? (item as any).id || (item as any).group_name : 'no item', count);
    setDeleteModal({ isOpen: true, type, item, count });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('Starting delete operation:', deleteModal.type, deleteModal.item);

      switch (deleteModal.type) {
        case 'single':
          if (deleteModal.item) {
            const marker = deleteModal.item as POI;
            console.log('Deleting single marker:', marker.id, marker.label);
            await deletePoi(marker);
          }
          break;
        case 'group':
          if (deleteModal.item) {
            const groupItem = deleteModal.item as GroupItem;
            console.log('Deleting group:', groupItem.group_name, 'with', groupItem.markers.length, 'markers');

            for (const marker of groupItem.markers) {
              console.log('Deleting marker from group:', marker.id, marker.label);
              await deletePoi(marker);
            }
            console.log('Group deletion completed');
          }
          break;
        case 'selected':
          console.log('Deleting selected markers');
          await deleteSelected();
          break;
        case 'all':
          console.log('Deleting all markers');
          await deleteAll();
          break;
      }

      console.log('Delete operation completed successfully');
      setDeleteModal({ isOpen: false, type: 'single' });
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete operation failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

 async function deleteSelected() {
  if (checkedIds.length === 0) return;
  try {
    const { error } = await supabase
      .from("ar_pois")
      .delete()
      .in("id", checkedIds);

    if (error) {
      console.error('Error deleting selected markers:', error);
      alert('Failed to delete selected markers. Please try again.');
      return;
    }

    console.log('Selected markers deleted successfully:', checkedIds);
    fetchPois();
    setCheckedIds([]);
    setSelectAll(false);
    setSelected(null);
    setMapLocation(null);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (err) {
    console.error('Delete selected operation failed:', err);
    alert('Failed to delete selected markers. Please try again.');
  }
}


async function deleteAll() {
  if (pois.length === 0) return;
  try {
    const idsToDelete = pois.map(p => p.id!).filter(id => id !== undefined);
    const { error } = await supabase
      .from("ar_pois")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      console.error('Error deleting all markers:', error);
      alert('Failed to delete all markers. Please try again.');
      return;
    }

    console.log('All markers deleted successfully:', idsToDelete.length, 'markers');
    fetchPois();
    setCheckedIds([]);
    setSelectAll(false);
    setSelected(null);
    setMapLocation(null);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (err) {
    console.error('Delete all operation failed:', err);
    alert('Failed to delete all markers. Please try again.');
  }
}

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Builded Pens</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="home-content" fullscreen>
        <div className="builded-wrap">
          <div className="combined-container">
            <div className="builded-card">
              {!selected && !showCalendarView && (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <h3>All Saved Markers</h3>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button className="btn" onClick={() => setShowCalendarView(true)} style={{padding: '8px 12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem'}}>
                        📅 View Calendar
                      </button>
                    </div>
                  </div>
  
                  {/* Filter Options */}
                  <div style={{background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)'}}>
                    <h4 style={{margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', fontWeight: '600', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'}}>View Options</h4>
                    <div style={{display:'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', background: showPermanentMarks ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: showPermanentMarks ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s', backdropFilter: 'blur(10px)'}}>
                        <input type="checkbox" checked={showPermanentMarks} onChange={e => setShowPermanentMarks(e.target.checked)} style={{margin: 0}} />
                        <span style={{fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)'}}>Permanent Marks</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', background: showGroupMarks ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: showGroupMarks ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s', backdropFilter: 'blur(10px)'}}>
                        <input type="checkbox" checked={showGroupMarks} onChange={e => setShowGroupMarks(e.target.checked)} style={{margin: 0}} />
                        <span style={{fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)'}}>Group Marks</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', background: showDatedMarks ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: showDatedMarks ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s', backdropFilter: 'blur(10px)'}}>
                        <input type="checkbox" checked={showDatedMarks} onChange={e => setShowDatedMarks(e.target.checked)} style={{margin: 0}} />
                        <span style={{fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)'}}>Dated Marks</span>
                      </label>
                    </div>
                  </div>
  
                  {/* Action Buttons */}
                  <div style={{display:'flex', flexWrap: 'wrap', gap:8, marginBottom:12}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', border: selectAll ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease'}}>
                      <input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} style={{margin: 0}} />
                      <span style={{fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)'}}>Select All</span>
                    </label>
                    <button className="btn danger" onClick={() => handleDeleteClick('all', undefined, pois.length)} style={{padding: '8px 16px'}}>
                      🗑️ Delete All
                    </button>
                    <button className="btn danger" onClick={() => handleDeleteClick('selected', undefined, checkedIds.length)} disabled={checkedIds.length === 0} style={{padding: '8px 16px'}}>
                      🗑️ Delete Selected ({checkedIds.length})
                    </button>
                  </div>
                  <div className="poi-list">
                    {getFilteredPois().map((item, index) => {
                      if ('isGroup' in item) {
                        
                        return (
                          <div key={`group-${item.group_name}-${item.group_index}`} className="poi-item" style={{position: 'relative'}}>
                            {item.markers.some(m => isOutdated(m)) && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#ff4757',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}>
                                HAS OUTDATED
                              </div>
                            )}
                            <div style={{position: 'absolute', top: '12px', right: '12px'}}>
                              <input type="checkbox" checked={item.markers.every(m => checkedIds.includes(m.id!))} onChange={() => {
                                const allChecked = item.markers.every(m => checkedIds.includes(m.id!));
                                const newIds = allChecked
                                  ? checkedIds.filter(id => !item.markers.some(m => m.id === id))
                                  : [...checkedIds, ...item.markers.map(m => m.id!).filter(id => !checkedIds.includes(id))];
                                setCheckedIds(newIds);
                              }} />
                            </div>
                            <div className="poi-meta">
                              <span className="poi-label">{item.group_name}</span>
                              <span className="poi-coords">{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</span>
                              <span className="poi-type">{item.mark_type} (Group)</span>
                              <span className="poi-color" style={{backgroundColor: item.color}}></span>
                              <span className="poi-height">{item.markers.length} markers</span>
                              {item.markers.some(m => isOutdated(m)) && (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(255, 71, 87, 0.1)',
                                  border: '1px solid rgba(255, 71, 87, 0.3)',
                                  borderRadius: '6px',
                                  color: '#ff4757',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}>
                                  ⚠️ This group contains outdated marks - please review and update them
                                </div>
                              )}
                            </div>
                            <div className="poi-actions">
                              <button className="btn view" onClick={() => setSelected(item.markers[0])}>Details</button>
                              <button className="btn edit" onClick={() => setSelected({ ...item.markers[0], editing: true })}>Edit</button>
                              <button className="btn view" onClick={() => setMapLocation(item)}>View</button>
                              <button className="btn danger" onClick={() => handleDeleteClick('group', item)}>Delete</button>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={item.id} className="poi-item" style={{position: 'relative'}}>
                            {isOutdated(item) && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#ff4757',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}>
                                OUTDATED
                              </div>
                            )}
                            <div style={{position: 'absolute', top: '12px', right: '12px'}}>
                              <input type="checkbox" checked={checkedIds.includes(item.id!)} onChange={() => handleCheck(item.id!)} />
                            </div>
                            <div className="poi-meta">
                              <span className="poi-label">{item.label}</span>
                              <span className="poi-coords">{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</span>
                              <span className="poi-type">{item.mark_type}</span>
                              <span className="poi-color" style={{backgroundColor: item.color}}></span>
                              {isOutdated(item) && (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(255, 71, 87, 0.1)',
                                  border: '1px solid rgba(255, 71, 87, 0.3)',
                                  borderRadius: '6px',
                                  color: '#ff4757',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}>
                                  ⚠️ This mark is outdated - please update or remove it
                                </div>
                              )}
                            </div>
                            <div className="poi-actions">
                              <button className="btn view" onClick={() => setSelected(item)}>Details</button>
                              <button className="btn edit" onClick={() => setSelected({ ...item, editing: true })}>Edit</button>
                              <button className="btn view" onClick={() => setMapLocation(item)}>View</button>
                              <button className="btn danger" onClick={() => handleDeleteClick('single', item)}>Delete</button>
                            </div>
                          </div>
                        );
                      }
                    })}
                    {pois.length === 0 && <div className="empty">No markers saved yet.</div>}
                  </div>
                </>
              )}

              {!selected && showCalendarView && (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <h3>Calendar View</h3>
                    <button className="btn" onClick={() => {setShowCalendarView(false); setSelectedDateMarkers([]);}} style={{padding: '8px', background: 'transparent', color: '#007cf0', border: '1px solid #007cf0'}}>
                      ✕
                    </button>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', minHeight: '400px'}}>
                    <div style={{marginBottom: '30px', padding: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)'}}>
                      <IonDatetime
                        presentation="date"
                        value={selectedDate}
                        onIonChange={(e) => {
                          const date = e.detail.value as string;
                          setSelectedDate(date);
                          const dateObj = new Date(date);
                          const dateStr = dateObj.toISOString().split('T')[0];
                          const markersForDate = pois.filter(p =>
                            p.dates && p.dates.some(d => d.startsWith(dateStr))
                          );
                          setSelectedDateMarkers(markersForDate);
                        }}
                        style={{'--background': 'transparent', '--color': '#007cf0'}}
                      />
                    </div>
                    {selectedDateMarkers.length > 0 && (
                      <div style={{width: '100%', maxWidth: '600px'}}>
                        <h4 style={{textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'}}>
                          Markers for {new Date(selectedDate).toLocaleDateString()}
                        </h4>
                        <div className="poi-list" style={{gridTemplateColumns: '1fr'}}>
                          {selectedDateMarkers.map((p) => (
                            <div key={p.id} className="poi-item" style={{minHeight: 'auto', padding: '16px', marginBottom: '12px'}}>
                              <div className="poi-meta" style={{marginBottom: 12}}>
                                <span className="poi-label" style={{fontSize: '1.1rem', fontWeight: '600'}}>{p.label}</span>
                                <span className="poi-coords" style={{fontSize: '0.9rem'}}>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                                <span className="poi-type" style={{fontSize: '0.85rem'}}>{p.mark_type}</span>
                                <span className="poi-color" style={{backgroundColor: p.color}}></span>
                              </div>
                              <div className="poi-actions" style={{gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                                <button className="btn view" onClick={() => {setSelected(p); setShowCalendarView(false);}}>Details</button>
                                <button className="btn view" onClick={() => setMapLocation(p)}>View on Map</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedDateMarkers.length === 0 && (
                      <div style={{textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', marginTop: '20px'}}>
                        <p>No markers found for the selected date.</p>
                        <p style={{fontSize: '0.9rem', marginTop: '8px'}}>Try selecting a different date.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selected && !('editing' in selected ? selected.editing : false) && (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <h3>{'isGroup' in selected ? 'Group Details' : 'Marker Details'}</h3>
                    <button className="btn" onClick={() => setSelected(null)} style={{padding: '8px', background: 'transparent', color: '#007cf0', border: '1px solid #007cf0'}}>
                      ✕
                    </button>
                  </div>
                  {'isGroup' in selected ? (
                   <div>
                      <div style={{padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', marginBottom: 16, border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)'}}>
                        <p><strong>Group Name:</strong> {selected.group_name}</p>
                        <p><strong>Mark Type:</strong> {selected.mark_type}</p>
                        <p><strong>Color:</strong> <span style={{backgroundColor: selected.color, display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', marginLeft: '8px'}}></span> {selected.color}</p>
                        <p><strong>Markers in Group:</strong> {selected.markers.length}</p>
                      </div>
                      <div style={{marginBottom: 16}}>
                        <h4 style={{marginBottom: '16px', color: 'rgba(255, 255, 255, 0.9)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)', paddingBottom: '8px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'}}>All Markers in this Group:</h4>
                        <div style={{display: 'grid', gap: '12px'}}>
                          {selected.markers.map((marker, index) => (
                            <div key={marker.id} style={{
                              padding: '16px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                              position: 'relative',
                              backdropFilter: 'blur(10px)'
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                backgroundColor: selected.color,
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {index + 1}
                              </div>
                              <div style={{marginBottom: '12px'}}>
                                <h5 style={{margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'}}>{marker.label}</h5>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                                  <span style={{
                                    backgroundColor: selected.color,
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    display: 'inline-block'
                                  }}></span>
                                  <span style={{fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)'}}>{selected.mark_type}</span>
                                </div>
                              </div>
                              <div style={{fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)'}}>
                                <div style={{marginBottom: '4px'}}>
                                  <strong>📍 Coordinates:</strong> {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                </div>
                                <div>
                                  {marker.dates && marker.dates.length > 0 ? (
                                    marker.dates.length === 1 ? (
                                      <><strong>📅 Saved on:</strong> {new Date(marker.dates[0]).toLocaleDateString()}</>
                                    ) : (
                                      <><strong>📅 Saved on multiple dates:</strong> {marker.dates.map(d => new Date(d).toLocaleDateString()).join(', ')}</>
                                    )
                                  ) : (
                                    <><strong>This is a permanent mark</strong></>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{marginTop:12}}>
                        <button className="btn edit" onClick={() => setSelected({ ...selected, editing: true })}>Edit Group</button>
                        <button className="btn view" onClick={() => setMapLocation(selected.markers[0])} style={{marginLeft:8}}>View on Map</button>
                        <button className="btn danger" onClick={() => handleDeleteClick('group', selected)} style={{marginLeft:8}}>Delete Group</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{padding: '16px', background: 'rgba(0, 124, 240, 0.05)', borderRadius: '12px', marginBottom: 16}}>
                        <p><strong>Mark Type:</strong> {selected.mark_type}</p>
                        <p><strong>Color:</strong> <span style={{backgroundColor: selected.color, display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', marginLeft: '8px'}}></span> {selected.color}</p>
                        <p><strong>Label:</strong> {selected.label}</p>
                        <p><strong>Coordinates:</strong> {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p>
                        {selected.dates && selected.dates.length > 0 ? (
                          selected.dates.length === 1 ? (
                            <p><strong>Saved on:</strong> {new Date(selected.dates[0]).toLocaleDateString()}</p>
                          ) : (
                            <p><strong>Saved on multiple dates:</strong> {selected.dates.map(d => new Date(d).toLocaleDateString()).join(', ')}</p>
                          )
                        ) : (
                          <p><strong>This is a permanent mark</strong></p>
                        )}
                        {selected.group_name && (() => {
                          const group = getFilteredPois().find(item =>
                            'isGroup' in item && item.markers.some(m => m.id === selected.id)
                          ) as GroupItem;
                          return group ? (
                            <div style={{
                              marginTop: '12px',
                              padding: '8px 12px',
                              background: 'rgba(255, 193, 7, 0.1)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 193, 7, 0.3)',
                              backdropFilter: 'blur(10px)'
                            }}>
                              <p style={{margin: 0, fontSize: '0.9rem', color: '#856404'}}>
                                <strong>📊 Group Info:</strong> Part of "{group.group_name}" group with {group.markers.length} total markers
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div style={{marginTop:12}}>
                        <button className="btn edit" onClick={() => setSelected({ ...selected, editing: true })}>Edit</button>
                        <button className="btn view" onClick={() => setMapLocation(selected)} style={{marginLeft:8}}>View on Map</button>
                        <button className="btn danger" onClick={() => handleDeleteClick('single', selected)} style={{marginLeft:8}}>Delete Marker</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selected && ('editing' in selected ? selected.editing : false) && (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <h3>{'isGroup' in selected ? 'Edit Group' : 'Edit Marker'}</h3>
                    <button className="btn" onClick={() => setSelected(null)} style={{padding: '8px', background: 'transparent', color: '#007cf0', border: '1px solid #007cf0'}}>
                      ✕
                    </button>
                  </div>
                  {'isGroup' in selected ? (
                   <div style={{display: 'grid', gap: 16}}>
                      <div>
                        <label>Select Marker to Edit</label>
                        <select
                          className="input"
                          onChange={(e) => {
                            const markerIndex = parseInt(e.target.value);
                            if (markerIndex >= 0) {
                             setSelected({ ...selected.markers[markerIndex], editing: true });
                            }
                             e.target.value = "-1";
                          }}
                        >
                          <option value="-1">Edit Group Properties</option>
                          {selected.markers.map((marker, index) => (
                            <option key={marker.id} value={index}>
                              Edit Marker #{index + 1}: {marker.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Group Name</label>
                        <input
                          className="input"
                          value={selected.group_name}
                          onChange={(e) => setSelected({ ...selected, group_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Mark Type</label>
                        <select
                          className="input"
                          value={selected.mark_type}
                          onChange={(e) => setSelected({ ...selected, mark_type: e.target.value })}
                        >
                          <option value="building">Building</option>
                          <option value="department">Department</option>
                          <option value="events">Events</option>
                          <option value="rooms">Rooms</option>
                          <option value="hazard">Hazard</option>
                        </select>
                      </div>
                      <div>
                        <label>Color</label>
                        <input
                          className="input"
                          type="color"
                          value={selected.color}
                          onChange={(e) => setSelected({ ...selected, color: e.target.value })}
                        />
                      </div>
                      <div style={{marginTop:20, display: 'flex', gap: 12}}>
                        <button className="btn primary" onClick={() => {
                         selected.markers.forEach((marker, index) => {
                            const newGroupName = `${selected.group_name} #${index + 1}`;
                            updatePoi({ ...marker, mark_type: selected.mark_type, color: selected.color, group_name: newGroupName });
                          });
                          setSelected(null);
                        }}>
                          Save Group Changes
                        </button>
                        <button className="btn danger" onClick={() => handleDeleteClick('group', selected)}>
                          Delete Entire Group
                        </button>
                        <button className="btn" onClick={() => setSelected(null)}>
                          Cancel
                        </button>
                      </div>
                      <div style={{marginTop:12, padding: '12px', background: 'rgba(255,107,107,0.08)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.2)'}}>
                        <p style={{margin: 0, fontSize: '0.9rem', color: '#e53e3e', fontWeight: '500'}}>
                          💡 <strong>Quick Delete:</strong> You can also delete this group directly from the details view above.
                        </p>
                      </div>
                    </div>
                  ) : (
                   <div style={{display: 'grid', gap: 16}}>
                      {selected.group_name && (
                        <div>
                          <label>Switch to Edit Other Markers in Group</label>
                          <select
                            className="input"
                            onChange={(e) => {
                              const markerIndex = parseInt(e.target.value);
                              if (markerIndex >= 0) {
                               const group = getFilteredPois().find(item =>
                                  'isGroup' in item && item.markers.some(m => m.id === selected.id)
                                ) as GroupItem;
                                if (group) {
                                  setSelected({ ...group.markers[markerIndex], editing: true });
                                }
                              }
                              e.target.value = "-1";
                            }}
                          >
                            <option value="-1">Select Marker to Edit</option>
                            {(() => {
                              const group = getFilteredPois().find(item =>
                                'isGroup' in item && item.markers.some(m => m.id === selected.id)
                              ) as GroupItem;
                              return group ? group.markers.map((marker, index) => (
                                <option key={marker.id} value={index}>
                                  Edit Marker #{index + 1}: {marker.label}
                                </option>
                              )) : null;
                            })()}
                          </select>
                        </div>
                      )}
                      <div>
                        <label>Label *</label>
                        <input
                          className="input"
                          value={selected.label}
                          onChange={(e) => setSelected({ ...selected, label: e.target.value })}
                          placeholder="Enter marker label"
                          required
                        />
                        {selected.label.trim() === '' && (
                          <div style={{color: '#e53e3e', fontSize: '0.8rem', marginTop: '4px'}}>
                            Label is required
                          </div>
                        )}
                      </div>
                      <div>
                        <label>Mark Type</label>
                        <select
                          className="input"
                          value={selected.mark_type}
                          onChange={(e) => setSelected({ ...selected, mark_type: e.target.value })}
                        >
                          <option value="building">Building</option>
                          <option value="department">Department</option>
                          <option value="events">Events</option>
                          <option value="rooms">Rooms</option>
                          <option value="hazard">Hazard</option>
                        </select>
                      </div>
                      <div>
                        <label>Color</label>
                        <input
                          className="input"
                          type="color"
                          value={selected.color}
                          onChange={(e) => setSelected({ ...selected, color: e.target.value })}
                        />
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                        <div>
                          <label>Latitude *</label>
                          <input
                            className="input"
                            type="number"
                            step="0.00001"
                            min="-90"
                            max="90"
                            value={selected.lat}
                            onChange={(e) => setSelected({ ...selected, lat: Number(e.target.value) })}
                            placeholder="-90 to 90"
                          />
                          {(selected.lat < -90 || selected.lat > 90) && (
                            <div style={{color: '#e53e3e', fontSize: '0.8rem', marginTop: '4px'}}>
                              Latitude must be between -90 and 90
                            </div>
                          )}
                        </div>
                        <div>
                          <label>Longitude *</label>
                          <input
                            className="input"
                            type="number"
                            step="0.00001"
                            min="-180"
                            max="180"
                            value={selected.lng}
                            onChange={(e) => setSelected({ ...selected, lng: Number(e.target.value) })}
                            placeholder="-180 to 180"
                          />
                          {(selected.lng < -180 || selected.lng > 180) && (
                            <div style={{color: '#e53e3e', fontSize: '0.8rem', marginTop: '4px'}}>
                              Longitude must be between -180 and 180
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Preview */}
                      <div style={{marginTop: '16px', padding: '12px', background: 'rgba(0, 124, 240, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 124, 240, 0.2)'}}>
                        <h4 style={{margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem'}}>📍 Location Preview</h4>
                        <div style={{fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)'}}>
                          <div>Coordinates: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</div>
                          <div style={{marginTop: '4px'}}>
                            <span style={{backgroundColor: selected.color, display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', marginRight: '6px'}}></span>
                            {selected.mark_type}
                          </div>
                        </div>
                      </div>
                      <div style={{marginTop:20, display: 'flex', gap: 12, flexWrap: 'wrap'}}>
                        <button
                          className="btn primary"
                          onClick={() => updatePoi(selected)}
                          disabled={
                            selected.label.trim() === '' ||
                            selected.lat < -90 || selected.lat > 90 ||
                            selected.lng < -180 || selected.lng > 180
                          }
                        >
                          💾 Save Changes
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            // Reset to original values (assuming we have original data)
                            fetchPois(); // Refresh to get original data
                            setSelected(null);
                            setTimeout(() => setSelected({ ...selected, editing: false }), 100);
                          }}
                          style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}
                        >
                          🔄 Reset Changes
                        </button>
                        <button className="btn danger" onClick={() => handleDeleteClick('single', selected)}>
                          🗑️ Delete Marker
                        </button>
                        <button className="btn" onClick={() => setSelected(null)}>
                          ❌ Cancel
                        </button>
                      </div>
                      <div style={{marginTop:12, padding: '12px', background: 'rgba(255,107,107,0.08)', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.2)'}}>
                        <p style={{margin: 0, fontSize: '0.9rem', color: '#e53e3e', fontWeight: '500'}}>
                          💡 <strong>Quick Delete:</strong> You can also delete this marker directly from the details view above.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="map-container">
            <div className="builded-card">
              <h3>Map View</h3>
              {mapLocation ? (
                <div ref={mapContainer} style={{height: '100%'}} />
              ) : (
                <div style={{height: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <p>Map integration placeholder</p>
                  <p>Select a marker to view on map</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>

      {/* Professional Delete Confirmation Modal */}
      <IonModal
        isOpen={deleteModal.isOpen}
        onDidDismiss={() => setDeleteModal({ isOpen: false, type: 'single' })}
        className="delete-confirmation-modal"
        backdropDismiss={false}
        style={{
          '--width': 'auto',
          '--height': 'auto',
          '--border-radius': '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{
          padding: '32px',
          background: 'white',
          borderRadius: '16px',
          margin: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          maxWidth: '450px',
          position: 'relative'
        }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 12px 32px rgba(238, 90, 82, 0.4)',
              position: 'relative'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <IonIcon icon={close} style={{ fontSize: '36px', color: 'white' }} />
              </div>
            </div>

            <h2 style={{
              margin: '0 0 12px 0',
              color: '#1a202c',
              fontSize: '1.75rem',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Confirm Deletion
            </h2>

            <div style={{
              padding: '16px 20px',
              background: 'rgba(255,107,107,0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(255,107,107,0.2)',
              marginBottom: '8px'
            }}>
              <p style={{
                margin: 0,
                color: '#2d3748',
                fontSize: '1.1rem',
                fontWeight: '500',
                lineHeight: '1.5'
              }}>
                {deleteModal.type === 'single' && deleteModal.item && (
                  <>Are you sure you want to permanently delete <strong>"{(deleteModal.item as POI).label}"</strong>?</>
                )}
                {deleteModal.type === 'group' && deleteModal.item && (
                  <>Are you sure you want to permanently delete the entire <strong>"{(deleteModal.item as GroupItem).group_name}"</strong> group containing <strong>{(deleteModal.item as GroupItem).markers.length} markers</strong>?</>
                )}
                {deleteModal.type === 'selected' && (
                  <>Are you sure you want to permanently delete <strong>{deleteModal.count} selected marker(s)</strong>?</>
                )}
                {deleteModal.type === 'all' && (
                  <>Are you sure you want to permanently delete <strong>ALL markers</strong>? This action cannot be undone.</>
                )}
              </p>
            </div>

            <p style={{
              margin: '8px 0 0 0',
              color: '#e53e3e',
              fontSize: '0.95rem',
              fontWeight: '600',
              fontStyle: 'italic'
            }}>
              ⚠️ This action will permanently delete the data from the database and cannot be undone.
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setDeleteModal({ isOpen: false, type: 'single' })}
              disabled={isDeleting}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                color: '#4a5568',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                minWidth: '120px'
              }}
              onMouseOver={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
              }}
            >
              Cancel
            </button>

            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              style={{
                padding: '14px 28px',
                background: isDeleting ? '#9ca3af' : 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '140px',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: isDeleting ? 'none' : '0 4px 16px rgba(238, 90, 82, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(238, 90, 82, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(238, 90, 82, 0.3)';
                }
              }}
            >
              {isDeleting ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <IonIcon icon={close} style={{ fontSize: '18px' }} />
                  <span>Delete</span>
                </>
              )}

              {/* Ripple effect */}
              {!isDeleting && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '0',
                  height: '0',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  transform: 'translate(-50%, -50%)',
                  transition: 'width 0.6s, height 0.6s',
                  pointerEvents: 'none'
                }} className="ripple"></div>
              )}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .delete-confirmation-modal .modal-wrapper {
            --backdrop-opacity: 0.6;
            backdrop-filter: blur(8px);
          }

          .delete-confirmation-modal ion-backdrop {
            --backdrop-opacity: 0.6;
            backdrop-filter: blur(8px);
          }
        `}</style>
      </IonModal>

    <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)} onDidPresent={() => {
      setTimeout(() => {
        const input = document.querySelector('ion-input input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    }}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Marker</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowAddModal(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonItem>
            <IonLabel position="stacked">Label</IonLabel>
            <IonInput value={newMarkerLabel} onIonChange={e => setNewMarkerLabel(e.detail.value!)} placeholder="Enter marker label" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Mark Type</IonLabel>
            <IonSelect value={newMarkerMarkType} placeholder="Select mark type" onIonChange={e => setNewMarkerMarkType(e.detail.value)}>
              {markTypeOptions.map(option => (
                <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Color</IonLabel>
            <input type="color" value={newMarkerColor} onChange={e => setNewMarkerColor(e.target.value)} style={{width: '100%', height: '40px', border: 'none', borderRadius: '8px'}} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Latitude</IonLabel>
            <IonInput type="number" value={newMarkerLat} onIonChange={e => setNewMarkerLat(e.detail.value!)} placeholder="Latitude" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Longitude</IonLabel>
            <IonInput type="number" value={newMarkerLng} onIonChange={e => setNewMarkerLng(e.detail.value!)} placeholder="Longitude" />
          </IonItem>
          <IonButton expand="full" onClick={async () => {
            if (!newMarkerLat || !newMarkerLng || !newMarkerLabel || !newMarkerMarkType) {
              alert('Please fill all fields');
              return;
            }
            const { error } = await supabase.from('ar_pois').insert({
              lat: Number(newMarkerLat),
              lng: Number(newMarkerLng),
              label: newMarkerLabel,
              mark_type: newMarkerMarkType,
              color: newMarkerColor,
              height: 1,
            });
            if (error) {
              console.error('Error saving marker:', error);
              alert('Failed to save marker. Please try again.');
            } else {
              console.log('Marker saved successfully');
              setShowAddModal(false);
              setNewMarkerLabel('');
              setNewMarkerMarkType('');
              setNewMarkerColor('#007cf0');
              setNewMarkerLat('');
              setNewMarkerLng('');
              fetchPois();

              // Automatic page refresh after adding marker
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
          }} color="primary">
            <IonIcon icon={checkmark} slot="start" />
            Done
          </IonButton>
          <IonButton expand="full" onClick={() => setShowAddModal(false)} color="danger">
            <IonIcon icon={close} slot="start" />
            Cancel
          </IonButton>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Builded;