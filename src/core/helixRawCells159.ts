// Auto-extracted verbatim from the 159 .hlx cells bundle
export interface RawHlxCellRecord {
  fileName: string;
  title: string;
  prime: number;
  hlxSource: string;
}

export const RAW_HLX_CELLS_159: readonly RawHlxCellRecord[] = [
  {
    "fileName": "01_mem_pauli28.hlx",
    "title": "MEMORIA_PAULI_28B",
    "prime": 2,
    "hlxSource": "# HERRAMIENTA HELIX: MEMORIA_PAULI_28B (Primo 2 RES)\nᛇᚢ\nᛗᚦ mem_kernel\nᚠᚷ 28\nSET stride_bytes 28\nSET zero_gc 1\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "02_physics_cauchy_nemesis.hlx",
    "title": "FISICA_CAUCHY_NEMESIS",
    "prime": 41,
    "hlxSource": "# HERRAMIENTA HELIX: FISICA_CAUCHY_NEMESIS (Primo 41 ROT)\nᛇᚢ\nᛗᚦ physics_core\nSET gamma 0.005\nSET thermal 0.001\nSET biopixels 3686400\nᚩᛢ cauchy_field active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "03_audio_p33_cymatic.hlx",
    "title": "RESONANCIA_P33",
    "prime": 7,
    "hlxSource": "# HERRAMIENTA HELIX: RESONANCIA_P33 (Primo 7 ANSUZ)\nᛇᚢ\nᛗᚦ audio_dsp\nSET prime_p33 7\nSET freq_hz 457.84\nᚩᛖ freq_hz\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "04_render_3d_pbr.hlx",
    "title": "MOTOR_3D_PBR",
    "prime": 79,
    "hlxSource": "# HERRAMIENTA HELIX: MOTOR_3D_PBR (Primo 79 EXP)\nᛇᚢ\nᛗᚦ render_pbr\nᚠᛜ core_mesh sphere 640 1.0\nᛟᛣ core_mesh 0.92 0.22 0.90\nᚱᚣ 0.0 1.55 -2.5 0 0 45\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "05_quantum_bloch.hlx",
    "title": "QUBIT_ESFERA_BLOCH",
    "prime": 43,
    "hlxSource": "# HERRAMIENTA HELIX: QUBIT_ESFERA_BLOCH (Primo 43 RND)\nᛇᚢ\nᛗᚦ quantum_bloch\nSET theta 0.0\nSET phi 0.0\nᚠᛜ bloch_sphere sphere 720 1.0\nᛟᛣ bloch_sphere 0.95 0.15 0.92\nᚠᛜ state_vector capsule 240 0.85\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "06_quantum_gates.hlx",
    "title": "PUERTAS_CUANTICAS_H_X_Z",
    "prime": 13,
    "hlxSource": "# HERRAMIENTA HELIX: PUERTAS_CUANTICAS_H_X_Z (Primo 13 RUN)\nᛇᚢ\nᛗᚦ quantum_alu\nSET prob_0 100\nSET prob_1 0\nDIV prob_0 2\nADD prob_1 50\nᚩᛖ prob_0\nᚩᛖ prob_1\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "07_student_lab_ui.hlx",
    "title": "INTERFAZ_ESTUDIANTE_LAB",
    "prime": 71,
    "hlxSource": "# HERRAMIENTA HELIX: INTERFAZ_ESTUDIANTE_LAB (Primo 71 MAN)\nᛇᚢ\nᛗᚦ student_ui\nSET interactive_bloch 1\nSET step_guide 1\nᚩᛢ student_lab ready\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "08_security_pqc_acl.hlx",
    "title": "SEGURIDAD_PQC_ACL",
    "prime": 5,
    "hlxSource": "# HERRAMIENTA HELIX: SEGURIDAD_PQC_ACL (Primo 5 ACL)\nᛇᚢ\nᛗᚦ sec_guard\nᛈᚫ\nSET pqc_verified 1\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "09_hilbert_lattice.hlx",
    "title": "HILBERT_LATTICE_VECTORS",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: HILBERT_LATTICE_VECTORS (Primo 11 RTE)\nᛇᚢ\nᛗᚦ hilbert_space\nSET dimensions 10\nSET coherence 0.98\nᚠᛜ vector_grid prism 360 1.0\nᚱᚳ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "10_annealing_solver.hlx",
    "title": "SIMULATED_ANNEALING_ENGINE",
    "prime": 37,
    "hlxSource": "# CELULA EXTRAIDA: SIMULATED_ANNEALING_ENGINE (Primo 37 EPC)\nᛇᚢ\nᛗᚦ optimizer_sa\nSET temp_init 1000\nSET cooling_rate 0.95\nLOOP 20\n  SUB temp_init 45\nEND\nᚩᛖ temp_init\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "100_biome_world_scatter.hlx",
    "title": "BIOME_REGISTRY_SCATTER",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: BIOME_REGISTRY_SCATTER (Primo 79 EXP)\nᛇᚢ\nᛗᚦ biome_world\nSET biomes_cnt 5\nSET props_scattered 64\nᛒᚢ\nᚩᛖ props_scattered\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "101_easing_playhead_interp.hlx",
    "title": "EASING_PLAYHEAD_TIMELINE",
    "prime": 83,
    "hlxSource": "# CELULA EXTRAIDA: EASING_PLAYHEAD_TIMELINE (Primo 83 TCK)\nᛇᚢ\nᛗᚦ playhead_interp\nSET duration_sec 60\nSET fps_step 16\nᛞᚾ\nᚩᛖ duration_sec\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "102_world_schema_boundary.hlx",
    "title": "WORLD_SCHEMA_ERROR_BOUNDARY",
    "prime": 47,
    "hlxSource": "# CELULA EXTRAIDA: WORLD_SCHEMA_ERROR_BOUNDARY (Primo 47 SBX)\nᛇᚢ\nᛗᚦ world_guard\nSET schema_ok 1\nᛉᚻ\nᚩᛢ world_boundary protected\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "103_world_spec_limits.hlx",
    "title": "WORLD_TERRAIN_SPEC_LIMITS",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: WORLD_TERRAIN_SPEC_LIMITS (Primo 13 RUN)\nᛇᚢ\nᛗᚦ world_spec\nSET terrain_res 128\nSET max_octaves 8\nSET max_biomes 6\nᚩᛖ terrain_res\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "104_http_abort_client.hlx",
    "title": "HTTP_ABORT_TIMEOUT_CLIENT",
    "prime": 67,
    "hlxSource": "# CELULA EXTRAIDA: HTTP_ABORT_TIMEOUT_CLIENT (Primo 67 BUS)\nᛇᚢ\nᛗᚦ http_client\nSET timeout_ms 30000\nSET max_body_mb 2\nᚩᛖ timeout_ms\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "105_world_prompt_generator.hlx",
    "title": "WORLD_JSON_SCHEMA_GEN",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: WORLD_JSON_SCHEMA_GEN (Primo 7 STR)\nᛇᚢ\nᛗᚦ world_prompt\nSET json_strict 1\nᚩᛢ world_spec_json generated\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "106_env_camera_bounds.hlx",
    "title": "ENV_ASSERT_CAMERA_BOUNDS",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: ENV_ASSERT_CAMERA_BOUNDS (Primo 5 ACL)\nᛇᚢ\nᛗᚦ env_cam_guard\nSET cam_fov 60\nSET cam_far 2000\nIF cam_fov > 0\n  SET env_ok 1\n  ᚩᛖ env_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "107_material3_ui_system.hlx",
    "title": "MATERIAL3_UI_DESIGN_SYSTEM",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: MATERIAL3_UI_DESIGN_SYSTEM (Primo 19 NOM)\nᛇᚢ\nᛗᚦ m3_ui\nSET ui_components 7\nSET rail_nav 1\nᚹ\nᚩᛖ ui_components\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "108_streaming_sse_pipe.hlx",
    "title": "STREAMING_COMPLETION_PIPE",
    "prime": 73,
    "hlxSource": "# CELULA EXTRAIDA: STREAMING_COMPLETION_PIPE (Primo 73 PIP)\nᛇᚢ\nᛗᚦ stream_pipe\nSET chunk_mode 1\nᛚᚣ\nᚩᛢ stream_chunk_ready ok\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "109_pwa_offline_manifest.hlx",
    "title": "PWA_OFFLINE_MANIFEST",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: PWA_OFFLINE_MANIFEST (Primo 97 PER)\nᛇᚢ\nᛗᚦ pwa_manifest\nSET installable 1\nᚩᛖ installable\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "11_dsp_signal_lab.hlx",
    "title": "DSP_SIGNAL_PROCESSOR",
    "prime": 73,
    "hlxSource": "# CELULA EXTRAIDA: DSP_SIGNAL_PROCESSOR (Primo 73 PIP)\nᛇᚢ\nᛗᚦ dsp_filter\nSET sample_rate 48000\nSET cutoff_hz 1200\nᚠᚷ 64\nᚩᛖ cutoff_hz\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "110_payload_error_middleware.hlx",
    "title": "PAYLOAD_VALIDATION_MIDDLEWARE",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: PAYLOAD_VALIDATION_MIDDLEWARE (Primo 5 ACL)\nᛇᚢ\nᛗᚦ http_guard\nSET payload_valid 1\nIF payload_valid > 0\n  ᚦᚩ\n  ᚩᛖ payload_valid\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "111_m3_dynamic_theme_tokens.hlx",
    "title": "M3_DYNAMIC_LIGHT_DARK_TOKENS",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: M3_DYNAMIC_LIGHT_DARK_TOKENS (Primo 19 NOM)\nᛇᚢ\nᛗᚦ m3_theme\nSET theme_mode 1\nSET primary_hue 257\nᚹ\nᚩᛖ primary_hue\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "112_concurrent_web_api_proxy.hlx",
    "title": "CONCURRENT_WEB_API_PROXY",
    "prime": 67,
    "hlxSource": "# CELULA EXTRAIDA: CONCURRENT_WEB_API_PROXY (Primo 67 BUS)\nᛇᚢ\nᛗᚦ web_api_proxy\nSET web_port 3000\nSET api_port 3001\nᚩᛖ api_port\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "113_typed_local_storage.hlx",
    "title": "TYPED_LOCAL_STORAGE_PERSIST",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: TYPED_LOCAL_STORAGE_PERSIST (Primo 97 PER)\nᛇᚢ\nᛗᚦ local_store\nSET storage_keys 2\nSET persist_ok 1\nᚩᛖ storage_keys\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "114_chat_composer_abort_api.hlx",
    "title": "CHAT_COMPOSER_ABORT_API",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: CHAT_COMPOSER_ABORT_API (Primo 7 STR)\nᛇᚢ\nᛗᚦ chat_composer\nSET abort_enabled 1\nᚩᛢ chat_composer_ready ok\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "115_multiplayer_ws_room.hlx",
    "title": "MULTIPLAYER_COLYSEUS_ROOM",
    "prime": 107,
    "hlxSource": "# CELULA EXTRAIDA: MULTIPLAYER_COLYSEUS_ROOM (Primo 107 DMN)\nᛇᚢ\nᛗᚦ ws_room\nSET max_clients 32\nSET room_active 1\nᚩᛢ multiplayer_room online\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "116_delta_state_sync.hlx",
    "title": "DELTA_PLAYER_STATE_SYNC",
    "prime": 67,
    "hlxSource": "# CELULA EXTRAIDA: DELTA_PLAYER_STATE_SYNC (Primo 67 BUS)\nᛇᚢ\nᛗᚦ delta_sync\nSET tick_hz 20\nSET players_synced 8\nᚩᛖ players_synced\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "117_avatar_reflector_world.hlx",
    "title": "AVATAR_REFLECTOR_STAGE",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: AVATAR_REFLECTOR_STAGE (Primo 79 EXP)\nᛇᚢ\nᛗᚦ virtual_world\nᚠᛜ player_capsule capsule 320 1.0\nᛟᛣ player_capsule 0.90 0.15 0.85\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "118_musical_note_synth.hlx",
    "title": "NOTE_TO_FREQUENCY_SYNTH",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: NOTE_TO_FREQUENCY_SYNTH (Primo 7 STR)\nᛇᚢ\nᛗᚦ note_synth\nSET note_a4_hz 440\nSET harmonics 4\nᚩᛖ note_a4_hz\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "119_multitrack_melody_gen.hlx",
    "title": "MULTITRACK_MELODY_SEQUENCER",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: MULTITRACK_MELODY_SEQUENCER (Primo 13 RUN)\nᛇᚢ\nᛗᚦ melody_seq\nSET tracks_count 4\nSET bpm 120\nLOOP 4\n  ADD tracks_count 1\nEND\nᚩᛖ bpm\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "12_rf_vband_shield.hlx",
    "title": "RF_VBAND_SPECTRUM",
    "prime": 47,
    "hlxSource": "# CELULA EXTRAIDA: RF_VBAND_SPECTRUM (Primo 47 SBX)\nᛇᚢ\nᛗᚦ rf_engine\nSET band_ghz 60\nSET attenuation_db 42\nᛉᚻ\nᚩᛢ rf_vband active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "120_session_auth_provider.hlx",
    "title": "SESSION_AUTH_IDENTITY",
    "prime": 71,
    "hlxSource": "# CELULA EXTRAIDA: SESSION_AUTH_IDENTITY (Primo 71 UID)\nᛇᚢ\nᛗᚦ session_auth\nSET session_valid 1\nᚦᚩ\nᚩᛖ session_valid\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "121_gravity_newton_iau.hlx",
    "title": "NEWTON_GRAVITY_IAU",
    "prime": 3,
    "hlxSource": "# CELULA EXTRAIDA: NEWTON_GRAVITY_IAU (Primo 3 INI)\nᛇᚢ\nᛗᚦ gravity_core\nSET mu_earth 398600\nSET radius_km 6771\nᚢ\nᚩᛖ radius_km\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "122_verlet_symplectic_int.hlx",
    "title": "VERLET_SYMPLECTIC_INTEGRATOR",
    "prime": 37,
    "hlxSource": "# CELULA EXTRAIDA: VERLET_SYMPLECTIC_INTEGRATOR (Primo 37 EPC)\nᛇᚢ\nᛗᚦ verlet_int\nSET dt_ms 16\nLOOP 10\n  ADD dt_ms 16\nEND\nᚩᛖ dt_ms\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "123_orbital_mechanics_kepler.hlx",
    "title": "ORBITAL_VELOCITY_ESCAPE",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: ORBITAL_VELOCITY_ESCAPE (Primo 11 RTE)\nᛇᚢ\nᛗᚦ orbital_alu\nSET v_orb_ms 7670\nSET v_esc_ms 10847\nᚱᚳ\nᚩᛖ v_orb_ms\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "124_schwarzschild_relativity.hlx",
    "title": "SCHWARZSCHILD_RADIUS_RELATIVITY",
    "prime": 131,
    "hlxSource": "# CELULA EXTRAIDA: SCHWARZSCHILD_RADIUS_RELATIVITY (Primo 131 KIL)\nᛇᚢ\nᛗᚦ relativity_gr\nSET rs_mm 9\nᛤᚾ\nᚩᛖ rs_mm\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "125_satellite_circular_trail.hlx",
    "title": "SATELLITE_MESH_CIRCULAR_TRAIL",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: SATELLITE_MESH_CIRCULAR_TRAIL (Primo 127 REG)\nᛇᚢ\nᛗᚦ sat_trail\nᚠᛜ sat_node sphere 360 0.8\nᛟᛣ sat_node 0.95 0.15 0.92\nSET trail_len 256\nᚩᛖ trail_len\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "126_orbital_energy_invariant.hlx",
    "title": "ORBITAL_ENERGY_MOMENTUM_INVARIANT",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: ORBITAL_ENERGY_MOMENTUM_INVARIANT (Primo 101 ECC)\nᛇᚢ\nᛗᚦ orbit_guard\nSET energy_conserved 1\nIF energy_conserved > 0\n  ᚩᛖ energy_conserved\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "127_result_ok_err_monad.hlx",
    "title": "RESULT_OK_ERR_DOMAIN_GUARD",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: RESULT_OK_ERR_DOMAIN_GUARD (Primo 5 ACL)\nᛇᚢ\nᛗᚦ result_monad\nSET is_ok 1\nIF is_ok > 0\n  ᚦᚩ\n  ᚩᛖ is_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "128_income_expense_ledger.hlx",
    "title": "INCOME_EXPENSE_LEDGER_REPO",
    "prime": 2,
    "hlxSource": "# CELULA EXTRAIDA: INCOME_EXPENSE_LEDGER_REPO (Primo 2 RES)\nᛇᚢ\nᛗᚦ finance_repo\nSET income_total 5000\nSET expense_total 1800\nSUB income_total 1800\nᚩᛖ income_total\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "129_monthly_category_kpi.hlx",
    "title": "MONTHLY_CATEGORY_KPI_SUMMARY",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: MONTHLY_CATEGORY_KPI_SUMMARY (Primo 13 RUN)\nᛇᚢ\nᛗᚦ kpi_summary\nSET categories_cnt 6\nSET months_cnt 12\nᚩᛖ categories_cnt\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "13_cellular_automata_3d.hlx",
    "title": "CELLULAR_AUTOMATA_CUBE3D",
    "prime": 61,
    "hlxSource": "# CELULA EXTRAIDA: CELLULAR_AUTOMATA_CUBE3D (Primo 61 FRK)\nᛇᚢ\nᛗᚦ automata_3d\nᚠᛜ aether_cube prism 480 1.1\nᛟᛣ aether_cube 0.90 0.25 0.85\nᛒᚢ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "130_cashflow_pie_charts.hlx",
    "title": "CASHFLOW_BAR_PIE_CHARTS",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: CASHFLOW_BAR_PIE_CHARTS (Primo 127 REG)\nᛇᚢ\nᛗᚦ finance_charts\nSET bar_series 12\nSET pie_slices 6\nᚩᛢ cashflow_charts rendered\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "131_statevector_12q_simulator.hlx",
    "title": "STATEVECTOR_12Q_UNITARY_ENGINE",
    "prime": 43,
    "hlxSource": "# CELULA EXTRAIDA: STATEVECTOR_12Q_UNITARY_ENGINE (Primo 43 RND)\nᛇᚢ\nᛗᚦ statevector_12q\nSET max_qubits 12\nSET pair_i0_i1 1\nᛈᚫ\nᚩᛖ max_qubits\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "132_quantum_dsl_lexer_parser.hlx",
    "title": "QUANTUM_BELL_STATE_DSL_PARSER",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: QUANTUM_BELL_STATE_DSL_PARSER (Primo 13 RUN)\nᛇᚢ\nᛗᚦ qdsl_parser\nSET q0_state 0\nSET q1_state 0\nSET bell_entangled 1\nIF bell_entangled > 0\n  ᚩᛖ bell_entangled\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "133_openqasm2_transpiler.hlx",
    "title": "OPENQASM2_CIRCUIT_TRANSPILER",
    "prime": 59,
    "hlxSource": "# CELULA EXTRAIDA: OPENQASM2_CIRCUIT_TRANSPILER (Primo 59 EXT)\nᛇᚢ\nᛗᚦ qasm2_export\nSET qasm_version 2\nᚩᛢ openqasm2_exported ok\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "134_quantum_circuit_ascii_view.hlx",
    "title": "QUANTUM_CIRCUIT_ASCII_RENDERER",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: QUANTUM_CIRCUIT_ASCII_RENDERER (Primo 127 REG)\nᛇᚢ\nᛗᚦ circuit_ascii\nSET circuit_depth 4\nSET gate_count 6\nᚩᛖ circuit_depth\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "135_multiformat_news_editor.hlx",
    "title": "MULTIFORMAT_NEWS_7_OUTPUTS",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: MULTIFORMAT_NEWS_7_OUTPUTS (Primo 7 STR)\nᛇᚢ\nᛗᚦ news_editor\nSET output_formats 7\nSET tone_mode 1\nᚩᛖ output_formats\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "136_teleprompter_script_sync.hlx",
    "title": "TELEPROMPTER_VIDEO_SCRIPT_SYNC",
    "prime": 83,
    "hlxSource": "# CELULA EXTRAIDA: TELEPROMPTER_VIDEO_SCRIPT_SYNC (Primo 83 TCK)\nᛇᚢ\nᛗᚦ teleprompter\nSET wpm_speed 140\nᛞᚾ\nᚩᛢ teleprompter_ready synced\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "137_scoped_structured_logger.hlx",
    "title": "SCOPED_STRUCTURED_LOGGER",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: SCOPED_STRUCTURED_LOGGER (Primo 127 REG)\nᛇᚢ\nᛗᚦ scoped_logger\nSET log_level 20\nᚩᛖ log_level\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "138_safe_public_error_guard.hlx",
    "title": "SAFE_PUBLIC_HTTP_ERROR_GUARD",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: SAFE_PUBLIC_HTTP_ERROR_GUARD (Primo 5 ACL)\nᛇᚢ\nᛗᚦ error_guard\nSET sanitize_err 1\nᚦᚩ\nᚩᛖ sanitize_err\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "139_kronecker_tensor_product.hlx",
    "title": "KRONECKER_TENSOR_PRODUCT",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: KRONECKER_TENSOR_PRODUCT (Primo 13 RUN)\nᛇᚢ\nᛗᚦ kron_alu\nSET dim_a 2\nSET dim_b 2\nMUL dim_a 2\nᚩᛖ dim_a\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "14_benchmark_timer.hlx",
    "title": "REALTIME_BENCHMARK_CLK",
    "prime": 53,
    "hlxSource": "# CELULA EXTRAIDA: REALTIME_BENCHMARK_CLK (Primo 53 CLK)\nᛇᚢ\nᛗᚦ perf_bench\nᛋᚹ\nSET metric_mode 1\nᚩᛖ metric_mode\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "140_svg_circuit_bloch_render.hlx",
    "title": "SVG_CIRCUIT_BLOCH_RENDER",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: SVG_CIRCUIT_BLOCH_RENDER (Primo 79 EXP)\nᛇᚢ\nᛗᚦ svg_qrender\nSET svg_wires 3\nSET bloch_radius 120\nᚩᛢ svg_quantum_diagram rendered\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "141_amplitude_prob_table.hlx",
    "title": "AMPLITUDE_PROBABILITY_TABLE",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: AMPLITUDE_PROBABILITY_TABLE (Primo 127 REG)\nᛇᚢ\nᛗᚦ amp_table\nSET states_count 4\nSET norm_sum_pct 100\nᚩᛖ norm_sum_pct\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "142_interval_block_primitives.hlx",
    "title": "INTERVAL_BLOCK_EPS_PRIMITIVES",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: INTERVAL_BLOCK_EPS_PRIMITIVES (Primo 19 NOM)\nᛇᚢ\nᛗᚦ interval_alu\nSET start_ms 0\nSET end_ms 1000\nᚹ\nᚩᛖ end_ms\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "143_counterexample_verdict.hlx",
    "title": "COUNTEREXAMPLE_EVIDENCE_VERDICT",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: COUNTEREXAMPLE_EVIDENCE_VERDICT (Primo 5 ACL)\nᛇᚢ\nᛗᚦ verdict_guard\nSET verdict_ok 1\nᚦᚩ\nᚩᛖ verdict_ok\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "144_no_overlap_predicate.hlx",
    "title": "NO_OVERLAP_INTERVAL_PREDICATE",
    "prime": 31,
    "hlxSource": "# CELULA EXTRAIDA: NO_OVERLAP_INTERVAL_PREDICATE (Primo 31 LCK)\nᛇᚢ\nᛗᚦ overlap_guard\nSET overlap_ms 0\nIF overlap_ms < 1\n  SET no_overlap_ok 1\n  ᚩᛖ no_overlap_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "145_zero_gap_continuity.hlx",
    "title": "ZERO_GAP_CONTINUITY_CHECK",
    "prime": 73,
    "hlxSource": "# CELULA EXTRAIDA: ZERO_GAP_CONTINUITY_CHECK (Primo 73 PIP)\nᛇᚢ\nᛗᚦ gap_guard\nSET gap_ms 0\nᛚᚣ\nᚩᛖ gap_ms\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "146_frame_containment_bound.hlx",
    "title": "FRAME_CONTAINMENT_BOUND",
    "prime": 47,
    "hlxSource": "# CELULA EXTRAIDA: FRAME_CONTAINMENT_BOUND (Primo 47 SBX)\nᛇᚢ\nᛗᚦ frame_guard\nSET within_frame 1\nᛉᚻ\nᚩᛖ within_frame\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "147_dual_formal_verifier.hlx",
    "title": "DUAL_FORMAL_VERIFIER_REPORT",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: DUAL_FORMAL_VERIFIER_REPORT (Primo 101 ECC)\nᛇᚢ\nᛗᚦ dual_verifier\nSET rules_passed 10\nᚩᛢ dual_verification passed\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "148_lockfree_ringbuffer_64b.hlx",
    "title": "LOCKFREE_SAB_RINGBUFFER_64B",
    "prime": 2,
    "hlxSource": "# CELULA EXTRAIDA: LOCKFREE_SAB_RINGBUFFER_64B (Primo 2 RES)\nᛇᚢ\nᛗᚦ sab_ringbuf\nᚠᚷ 64\nSET cache_line_b 64\nSET capacity_slots 224\nᚩᛖ capacity_slots\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "149_catmull_rom_camera_spline.hlx",
    "title": "CATMULL_ROM_CAMERA_SPLINE",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: CATMULL_ROM_CAMERA_SPLINE (Primo 11 RTE)\nᛇᚢ\nᛗᚦ spline_cam\nSET control_points 6\nᚱᚣ 0.0 4.0 12.0 0 0 50\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "15_webaudio_synth.hlx",
    "title": "WEBAUDIO_TONE_SYNTH",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: WEBAUDIO_TONE_SYNTH (Primo 7 STR)\nᛇᚢ\nᛗᚦ audio_out\nSET tone_hz 457\nᚩᛖ tone_hz\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "150_pbr_procedural_maps.hlx",
    "title": "PBR_ALBEDO_NORMAL_ROUGH_AO",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: PBR_ALBEDO_NORMAL_ROUGH_AO (Primo 79 EXP)\nᛇᚢ\nᛗᚦ pbr_maps\nSET pbr_channels 5\nᚠᛜ pbr_sphere sphere 720 1.0\nᛟᛣ pbr_sphere 0.92 0.18 0.90\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "151_fastpath_l2_security.hlx",
    "title": "FASTPATH_L2_SECURITY_ROUTER",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: FASTPATH_L2_SECURITY_ROUTER (Primo 5 ACL)\nᛇᚢ\nᛗᚦ fastpath_sec\nSET tsc_us 280\nᚦᚩ\nᚩᛖ tsc_us\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "152_offline_deterministic_failsafe.hlx",
    "title": "OFFLINE_DETERMINISTIC_FAILSAFE",
    "prime": 109,
    "hlxSource": "# CELULA EXTRAIDA: OFFLINE_DETERMINISTIC_FAILSAFE (Primo 109 FRE)\nᛇᚢ\nᛗᚦ offline_guard\nSET offline_ready 1\nᚩᛢ deterministic_failsafe active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "156_ast_mesh_budget_verifier.hlx",
    "title": "AST_MESH_BUDGET_10K",
    "prime": 101,
    "hlxSource": "# CELULA v1.5: AST_MESH_BUDGET_10K (Primo 101 ECC)\nᛇᚢ\nᛗᚦ ast_verify\nSET loop_max 100\nSET mesh_budget 10000\nIF mesh_budget > 0\n  ᚩᛖ mesh_budget\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "157_ws_sync_scene_guard.hlx",
    "title": "WS_SYNC_SCENE_GUARD",
    "prime": 5,
    "hlxSource": "# CELULA v1.5: WS_SYNC_SCENE_GUARD (Primo 5 ACL)\nᛇᚢ\nᛗᚦ ws_guard\nSET ack_ok 1\nᚦᚩ\nᚩᛢ ws_sync_scene verified\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "158_raycaster_orm_inspector.hlx",
    "title": "RAYCASTER_ORM_INSPECTOR",
    "prime": 103,
    "hlxSource": "# CELULA v1.5: RAYCASTER_ORM_INSPECTOR (Primo 103 PTR)\nᛇᚢ\nᛗᚦ raycast_orm\nᚠᛜ tower_prism prism 480 1.2\nᛟᛣ tower_prism 0.95 0.20 0.88\nᚣ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "159_qpsk_outbox_loop_emitter.hlx",
    "title": "QPSK_OUTBOX_LOOP_EMITTER",
    "prime": 73,
    "hlxSource": "# CELULA v1.5: QPSK_OUTBOX_LOOP_EMITTER (Primo 73 PIP)\nᛇᚢ\nᛗᚦ qpsk_outbox\nLOOP 4\n  ᚩᛢ qpsk132_frame emitted\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "16_collatz_orbit.hlx",
    "title": "COLLATZ_TRAJECTORY_SOLVER",
    "prime": 29,
    "hlxSource": "# CELULA EXTRAIDA: COLLATZ_TRAJECTORY_SOLVER (Primo 29 PRI)\nᛇᚢ\nᛗᚦ collatz_alu\nSET n_start 27\nSET steps 0\nLOOP 100\n  ADD steps 1\nEND\nᚩᛖ steps\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "17_shannon_entropy.hlx",
    "title": "SHANNON_BIT_ENTROPY",
    "prime": 43,
    "hlxSource": "# CELULA EXTRAIDA: SHANNON_BIT_ENTROPY (Primo 43 RND)\nᛇᚢ\nᛗᚦ entropy_calc\nSET bits_len 32\nSET shannon_h 1\nᛈᚫ\nᚩᛖ shannon_h\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "18_formal_sat_guard.hlx",
    "title": "FORMAL_SAT_UNSAT_GUARD",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: FORMAL_SAT_UNSAT_GUARD (Primo 101 ECC)\nᛇᚢ\nᛗᚦ smt_guard\nSET hard_cap 10000\nIF hard_cap > 0\n  SET proven_sat 1\n  ᚩᛖ proven_sat\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "19_orbit_entropy_chart.hlx",
    "title": "ORBIT_ENTROPY_VISUALIZER",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: ORBIT_ENTROPY_VISUALIZER (Primo 127 REG)\nᛇᚢ\nᛗᚦ chart_render\nᚠᛜ orbit_curve prism 320 1.0\nᛟᛣ orbit_curve 0.92 0.20 0.88\nᚩᛢ collatz_telemetry ready\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "20_5g_mmwave_pathloss.hlx",
    "title": "5G_MMWAVE_3GPP_TR38901",
    "prime": 59,
    "hlxSource": "# CELULA EXTRAIDA: 5G_MMWAVE_3GPP_TR38901 (Primo 59 EXT)\nᛇᚢ\nᛗᚦ mmwave_5g\nSET freq_ghz 28\nSET dist_m 250\nSET fspl_1m 61\nᚩᛖ fspl_1m\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "21_radar_fmcw_77ghz.hlx",
    "title": "RADAR_FMCW_77GHZ_AUTOMOTIVE",
    "prime": 103,
    "hlxSource": "# CELULA EXTRAIDA: RADAR_FMCW_77GHZ_AUTOMOTIVE (Primo 103 PTR)\nᛇᚢ\nᛗᚦ radar_77ghz\nSET carrier_ghz 77\nSET bandwidth_mhz 4000\nSET num_chirps 128\nᚠᛜ radar_beam cone 280 1.2\nᚣ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "22_fft_cfar_doppler.hlx",
    "title": "FFT_RANGE_DOPPLER_CFAR",
    "prime": 107,
    "hlxSource": "# CELULA EXTRAIDA: FFT_RANGE_DOPPLER_CFAR (Primo 107 DMN)\nᛇᚢ\nᛗᚦ cfar_detector\nSET samples_chirp 256\nSET cfar_threshold_db 14\nᚠᚷ 128\nLOOP 16\n  ADD cfar_threshold_db 1\nEND\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "23_satellite_itup676.hlx",
    "title": "SATELLITE_LINK_ITUP676",
    "prime": 89,
    "hlxSource": "# CELULA EXTRAIDA: SATELLITE_LINK_ITUP676 (Primo 89 FSD)\nᛇᚢ\nᛗᚦ sat_link\nSET elev_deg 35\nSET o2_att_db 2\nSET h2o_att_db 1\nᚩᛢ sat_link_p676 locked\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "24_rf_link_budget.hlx",
    "title": "RF_LINK_BUDGET_SNR",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: RF_LINK_BUDGET_SNR (Primo 19 NOM)\nᛇᚢ\nᛗᚦ link_budget\nSET tx_dbm 30\nSET tx_gain 24\nSET rx_gain 24\nADD tx_dbm 48\nᚹ\nᚩᛖ tx_dbm\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "25_crypto_sha_digest.hlx",
    "title": "CRYPTO_SHA256_SHA512",
    "prime": 43,
    "hlxSource": "# CELULA EXTRAIDA: CRYPTO_SHA256_SHA512 (Primo 43 RND)\nᛇᚢ\nᛗᚦ sha_engine\nSET digest_bits 256\nᛈᚫ\nᚩᛖ digest_bits\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "26_hmac_const_time.hlx",
    "title": "HMAC_SHA256_CONST_TIME",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: HMAC_SHA256_CONST_TIME (Primo 5 ACL)\nᛇᚢ\nᛗᚦ hmac_guard\nSET const_time_cmp 1\nᚦᚩ\nᚩᛖ const_time_cmp\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "27_ed25519_signer.hlx",
    "title": "ED25519_DIGITAL_SIGNATURE",
    "prime": 71,
    "hlxSource": "# CELULA EXTRAIDA: ED25519_DIGITAL_SIGNATURE (Primo 71 UID)\nᛇᚢ\nᛗᚦ ed25519_auth\nSET key_bits 256\nᛈᚫ\nᚩᛢ ed25519_sig verified\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "28_merkle_tree_proof.hlx",
    "title": "MERKLE_TREE_SHA256_PROOF",
    "prime": 41,
    "hlxSource": "# CELULA EXTRAIDA: MERKLE_TREE_SHA256_PROOF (Primo 41 ROT)\nᛇᚢ\nᛗᚦ merkle_root\nSET leaves_count 8\nSET tree_depth 3\nLOOP 3\n  ADD tree_depth 1\nEND\nᚩᛖ leaves_count\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "29_blockchain_pow_chain.hlx",
    "title": "BLOCKCHAIN_POW_CONSENSUS",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: BLOCKCHAIN_POW_CONSENSUS (Primo 97 PER)\nᛇᚢ\nᛗᚦ chain_pow\nSET difficulty 4\nSET nonce 0\nLOOP 16\n  ADD nonce 1\nEND\nᚩᛢ block_mined valid\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "30_audit_timestamp_cert.hlx",
    "title": "AUDIT_TIMESTAMP_CERT",
    "prime": 137,
    "hlxSource": "# CELULA EXTRAIDA: AUDIT_TIMESTAMP_CERT (Primo 137 ROM)\nᛇᚢ\nᛗᚦ audit_log\nSET record_sealed 1\nᛟᛥ\nᚩᛖ record_sealed\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "31_merito_sbt_soulbound.hlx",
    "title": "MERITO_SBT_SOULBOUND",
    "prime": 31,
    "hlxSource": "# CELULA EXTRAIDA: MERITO_SBT_SOULBOUND (Primo 31 LCK)\nᛇᚢ\nᛗᚦ sbt_reputation\nSET non_transferable 1\nᚠᛁ\nᚩᛖ non_transferable\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "32_merito_token_bridge.hlx",
    "title": "MERITO_ERC20_BRIDGE",
    "prime": 17,
    "hlxSource": "# CELULA EXTRAIDA: MERITO_ERC20_BRIDGE (Primo 17 ALC)\nᛇᚢ\nᛗᚦ token_bridge\nSET sbt_burned 1\nSET mto_minted 10\nᚠᚷ 64\nᚩᛖ mto_minted\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "33_tortuga_escrow.hlx",
    "title": "TORTUGA_ESCROW_ARBITRATION",
    "prime": 3,
    "hlxSource": "# CELULA EXTRAIDA: TORTUGA_ESCROW_ARBITRATION (Primo 3 INI)\nᛇᚢ\nᛗᚦ escrow_vault\nSET deposit_usdc 1000\nSET fee_pct 10\nSET payout 900\nIF payout > 0\n  ᚩᛖ payout\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "34_merit_scoring_engine.hlx",
    "title": "MERIT_SCORING_LEVELS",
    "prime": 13,
    "hlxSource": "# CELULA EXTRAIDA: MERIT_SCORING_LEVELS (Primo 13 RUN)\nᛇᚢ\nᛗᚦ merit_eval\nSET base_points 50\nMUL base_points 2\nᚩᛖ base_points\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "35_supply_invariant_guard.hlx",
    "title": "TOKEN_SUPPLY_INVARIANT",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: TOKEN_SUPPLY_INVARIANT (Primo 101 ECC)\nᛇᚢ\nᛗᚦ supply_guard\nSET total_supply 1000000\nIF total_supply > 0\n  SET invariant_ok 1\n  ᚩᛖ invariant_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "36_private_net_i2p_tor.hlx",
    "title": "PRIVATE_NETWORK_I2P_TOR",
    "prime": 47,
    "hlxSource": "# CELULA EXTRAIDA: PRIVATE_NETWORK_I2P_TOR (Primo 47 SBX)\nᛇᚢ\nᛗᚦ onion_router\nSET hops_count 3\nᛉᚻ\nᚩᛢ i2p_tor_tunnel active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "37_ppg_weber_peaks.hlx",
    "title": "PPG_WEBER_PEAK_DETECTOR",
    "prime": 23,
    "hlxSource": "# CELULA EXTRAIDA: PPG_WEBER_PEAK_DETECTOR (Primo 23 TRP)\nᛇᚢ\nᛗᚦ ppg_sensor\nSET heart_rate 72\nSET spo2 97\nSET weber_k 1\nᚻ\nᚩᛖ heart_rate\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "38_bio_range_guard.hlx",
    "title": "PHYSIOLOGICAL_RANGE_GUARD",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: PHYSIOLOGICAL_RANGE_GUARD (Primo 101 ECC)\nᛇᚢ\nᛗᚦ bio_guard\nSET hr_min 45\nSET hr_max 180\nIF hr_min > 0\n  SET range_valid 1\n  ᚩᛖ range_valid\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "39_zero_dep_http_bridge.hlx",
    "title": "ZERO_DEP_HTTP_BRIDGE",
    "prime": 67,
    "hlxSource": "# CELULA EXTRAIDA: ZERO_DEP_HTTP_BRIDGE (Primo 67 BUS)\nᛇᚢ\nᛗᚦ net_bridge\nSET port 9000\nᚩᛖ port\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "40_dual_mode_fallback.hlx",
    "title": "DUAL_MODE_WASM_NATIVE",
    "prime": 109,
    "hlxSource": "# CELULA EXTRAIDA: DUAL_MODE_WASM_NATIVE (Primo 109 FRE)\nᛇᚢ\nᛗᚦ fallback_ctrl\nSET mode_native 1\nᚩᛢ dual_mode_guard active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "41_omega1_intent_classifier.hlx",
    "title": "OMEGA1_INTENT_CLASSIFIER",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: OMEGA1_INTENT_CLASSIFIER (Primo 7 STR)\nᛇᚢ\nᛗᚦ omega1_agent\nSET intent_mode 1\nᚩᛖ intent_mode\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "42_architect_combinator.hlx",
    "title": "ARCHITECT_DNA_COMBINATOR",
    "prime": 17,
    "hlxSource": "# CELULA EXTRAIDA: ARCHITECT_DNA_COMBINATOR (Primo 17 ALC)\nᛇᚢ\nᛗᚦ architect_agent\nSET max_tools 12\nSET min_dna_score 3\nᚠᚷ 64\nᚩᛖ max_tools\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "43_protocol_l2_auditor.hlx",
    "title": "PROTOCOL_L2_AUDITOR",
    "prime": 5,
    "hlxSource": "# CELULA EXTRAIDA: PROTOCOL_L2_AUDITOR (Primo 5 ACL)\nᛇᚢ\nᛗᚦ protocol_l2\nSET dna_score 7\nSET law_1_det 1\nIF dna_score > 2\n  SET l2_approved 1\n  ᚩᛖ l2_approved\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "44_unified_factory_pipeline.hlx",
    "title": "UNIFIED_FACTORY_PIPELINE",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: UNIFIED_FACTORY_PIPELINE (Primo 11 RTE)\nᛇᚢ\nᛗᚦ factory_pipe\nᚱᚳ\nᚩᛢ factory_pipeline_l2 verified\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "45_aurora_graphic_agent.hlx",
    "title": "AURORA_GRAPHIC_AGENT",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: AURORA_GRAPHIC_AGENT (Primo 79 EXP)\nᛇᚢ\nᛗᚦ aurora_gfx\nᚠᛜ aurora_core torus 720 1.0\nᛟᛣ aurora_core 0.94 0.18 0.92\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "46_cauchy_tensor6_solver.hlx",
    "title": "CAUCHY_SYMMETRIC_TENSOR6",
    "prime": 41,
    "hlxSource": "# CELULA EXTRAIDA: CAUCHY_SYMMETRIC_TENSOR6 (Primo 41 ROT)\nᛇᚢ\nᛗᚦ tensor6_alu\nSET youngs_modulus 1000\nSET poisson_ratio 33\nSET sigma_xx 12\nSET sigma_yy 8\nSET sigma_xy 4\nᚩᛖ sigma_xx\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "47_von_mises_frobenius.hlx",
    "title": "VON_MISES_FROBENIUS_NORM",
    "prime": 59,
    "hlxSource": "# CELULA EXTRAIDA: VON_MISES_FROBENIUS_NORM (Primo 59 EXT)\nᛇᚢ\nᛗᚦ stress_norm\nSET von_mises 45\nSET frobenius 52\nIF von_mises > 0\n  ᚩᛖ von_mises\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "48_mesh_plate_torus_heart.hlx",
    "title": "MESH_GENERATORS_PLATE_TORUS_HEART",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: MESH_GENERATORS_PLATE_TORUS_HEART (Primo 79 EXP)\nᛇᚢ\nᛗᚦ mesh_gen\nᚠᛜ plate_mesh prism 400 1.0\nᚠᛜ torus_mesh torus 640 1.0\nᛟᛣ torus_mesh 0.90 0.25 0.88\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "49_raycast_impulse_ctrl.hlx",
    "title": "RAYCAST_IMPULSE_INJECTOR",
    "prime": 103,
    "hlxSource": "# CELULA EXTRAIDA: RAYCAST_IMPULSE_INJECTOR (Primo 103 PTR)\nᛇᚢ\nᛗᚦ raycast_ctrl\nSET hit_radius 15\nSET impulse_n 85\nᚣ\nᚩᛢ raycast_impulse injected\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "50_stress_heatmap_2d.hlx",
    "title": "STRESS_HEATMAP_HSL_RAMP",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: STRESS_HEATMAP_HSL_RAMP (Primo 127 REG)\nᛇᚢ\nᛗᚦ heatmap_2d\nSET hue_min 240\nSET hue_max 0\nᚩᛖ hue_max\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "51_point_cloud_nodes.hlx",
    "title": "POINT_CLOUD_6DOF_NODES",
    "prime": 2,
    "hlxSource": "# CELULA EXTRAIDA: POINT_CLOUD_6DOF_NODES (Primo 2 RES)\nᛇᚢ\nᛗᚦ point_cloud\nᚠᚷ 112\nSET node_stride 28\nᚩᛖ node_stride\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "52_xorshift32_prng.hlx",
    "title": "XORSHIFT32_DETERMINISTIC_PRNG",
    "prime": 43,
    "hlxSource": "# CELULA EXTRAIDA: XORSHIFT32_DETERMINISTIC_PRNG (Primo 43 RND)\nᛇᚢ\nᛗᚦ prng_xorshift\nSET seed_hex 12648430\nᛈᚫ\nᚩᛖ seed_hex\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "53_phase_coherence_order.hlx",
    "title": "PHASE_ORDER_PARAMETER",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: PHASE_ORDER_PARAMETER (Primo 19 NOM)\nᛇᚢ\nᛗᚦ coherence_core\nSET threshold_pct 35\nSET order_r 88\nIF order_r > 35\n  SET coherent_ok 1\n  ᚩᛖ coherent_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "54_phase_engine_purge.hlx",
    "title": "PHASE_ENGINE_SECURE_PURGE",
    "prime": 109,
    "hlxSource": "# CELULA EXTRAIDA: PHASE_ENGINE_SECURE_PURGE (Primo 109 FRE)\nᛇᚢ\nᛗᚦ phase_engine\nᚠᚷ 64\nLOOP 10\n  ADD step_cnt 1\nEND\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "55_normalized_entropy.hlx",
    "title": "NORMALIZED_ENTROPY_0_1",
    "prime": 37,
    "hlxSource": "# CELULA EXTRAIDA: NORMALIZED_ENTROPY_0_1 (Primo 37 EPC)\nᛇᚢ\nᛗᚦ norm_entropy\nSET norm_h 50\nᚩᛖ norm_h\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "56_complex_math_rng.hlx",
    "title": "COMPLEX_ARITHMETIC_RNG",
    "prime": 43,
    "hlxSource": "# CELULA EXTRAIDA: COMPLEX_ARITHMETIC_RNG (Primo 43 RND)\nᛇᚢ\nᛗᚦ complex_alu\nSET re_part 10\nSET im_part 24\nᛈᚫ\nᚩᛖ re_part\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "57_design_objectives_matrix.hlx",
    "title": "DESIGN_OBJECTIVES_MATRIX",
    "prime": 59,
    "hlxSource": "# CELULA EXTRAIDA: DESIGN_OBJECTIVES_MATRIX (Primo 59 EXT)\nᛇᚢ\nᛗᚦ obj_matrix\nSET target_snr_db 30\nSET target_budget_db 120\nSET target_lat_ms 20\nᚩᛖ target_snr_db\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "58_biopixel_automata_64.hlx",
    "title": "BIOPIXEL_AUTOMATA_64X64",
    "prime": 61,
    "hlxSource": "# CELULA EXTRAIDA: BIOPIXEL_AUTOMATA_64X64 (Primo 61 FRK)\nᛇᚢ\nᛗᚦ automata_64\nSET grid_w 64\nSET grid_h 64\nᛒᚢ\nᚩᛖ grid_w\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "59_isometric_projection_3d.hlx",
    "title": "ISOMETRIC_CUBE_PROJECTION",
    "prime": 103,
    "hlxSource": "# CELULA EXTRAIDA: ISOMETRIC_CUBE_PROJECTION (Primo 103 PTR)\nᛇᚢ\nᛗᚦ iso_proj\nᚠᛜ iso_cube prism 360 1.0\nᛟᛣ iso_cube 0.92 0.24 0.88\nᚣ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "60_design_tokens_a11y.hlx",
    "title": "DESIGN_TOKENS_A11Y",
    "prime": 19,
    "hlxSource": "# CELULA EXTRAIDA: DESIGN_TOKENS_A11Y (Primo 19 NOM)\nᛇᚢ\nᛗᚦ design_tokens\nSET layout_max 1120\nSET reduced_motion 1\nᚹ\nᚩᛖ layout_max\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "61_engineering_laws_8.hlx",
    "title": "ENGINEERING_8_LAWS_CONTRACT",
    "prime": 59,
    "hlxSource": "# CELULA EXTRAIDA: ENGINEERING_8_LAWS_CONTRACT (Primo 59 EXT)\nᛇᚢ\nᛗᚦ laws_guard\nSET laws_count 8\nIF laws_count > 0\n  SET contracts_ok 1\n  ᚩᛖ contracts_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "62_product_portfolio_site.hlx",
    "title": "PRODUCT_PORTFOLIO_SITE",
    "prime": 71,
    "hlxSource": "# CELULA EXTRAIDA: PRODUCT_PORTFOLIO_SITE (Primo 71 UID)\nᛇᚢ\nᛗᚦ corporate_site\nSET sections_cnt 6\nᚠᚷ 64\nᚩᛖ sections_cnt\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "63_content_scrollspy_nav.hlx",
    "title": "CONTENT_SCROLLSPY_NAV",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: CONTENT_SCROLLSPY_NAV (Primo 11 RTE)\nᛇᚢ\nᛗᚦ nav_router\nSET active_section 1\nᚱᚳ\nᚩᛖ active_section\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "64_crystal_vault_64b.hlx",
    "title": "CRYSTAL_VAULT_64B_ALIGNED",
    "prime": 2,
    "hlxSource": "# CELULA EXTRAIDA: CRYSTAL_VAULT_64B_ALIGNED (Primo 2 RES)\nᛇᚢ\nᛗᚦ crystal_vault\nᚠᚷ 64\nSET capacity_slots 4096\nSET slot_bytes 64\nᚩᛖ slot_bytes\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "65_uint16_bitfield_pack.hlx",
    "title": "UINT16_BITFIELD_PACK",
    "prime": 31,
    "hlxSource": "# CELULA EXTRAIDA: UINT16_BITFIELD_PACK (Primo 31 LCK)\nᛇᚢ\nᛗᚦ bitfield_alu\nSET kind_bits 8\nSET flag_bits 8\nᚠᛁ\nᚩᛖ flag_bits\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "66_vault_5_invariants.hlx",
    "title": "VAULT_5_INVARIANTS_FNV1A",
    "prime": 101,
    "hlxSource": "# CELULA EXTRAIDA: VAULT_5_INVARIANTS_FNV1A (Primo 101 ECC)\nᛇᚢ\nᛗᚦ vault_guard\nSET checks_total 5\nSET checks_passed 5\nIF checks_passed > 4\n  SET vault_valid 1\n  ᚩᛖ vault_valid\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "67_webgl2_r8ui_memgrid.hlx",
    "title": "WEBGL2_R8UI_BYTE_VISUALIZER",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: WEBGL2_R8UI_BYTE_VISUALIZER (Primo 127 REG)\nᛇᚢ\nᛗᚦ r8ui_texel\nSET bytes_per_texel 1\nSET zoom_max 64\nᚩᛢ r8ui_memgrid active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "68_secure_zero_purge.hlx",
    "title": "SECURE_ZERO_BUFFER_PURGE",
    "prime": 109,
    "hlxSource": "# CELULA EXTRAIDA: SECURE_ZERO_BUFFER_PURGE (Primo 109 FRE)\nᛇᚢ\nᛗᚦ zero_purge\nSET slot_count 0\nᚠᛠ\nᚩᛖ slot_count\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "69_scene_palette_director.hlx",
    "title": "SCENE_PALETTE_DIRECTOR",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: SCENE_PALETTE_DIRECTOR (Primo 11 RTE)\nᛇᚢ\nᛗᚦ scene_director\nSET palette_id 4\nSET cam_move 1\nᚱᚳ\nᚩᛖ palette_id\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "70_procedural_stage_5kinds.hlx",
    "title": "PROCEDURAL_STAGE_5KINDS",
    "prime": 79,
    "hlxSource": "# CELULA EXTRAIDA: PROCEDURAL_STAGE_5KINDS (Primo 79 EXP)\nᛇᚢ\nᛗᚦ stage_5kinds\nᚠᛜ stage_orb sphere 720 1.2\nᛟᛣ stage_orb 0.94 0.20 0.85\nᚱᚣ 0.0 3.0 8.0 0 0 60\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "71_audio_fft_bands.hlx",
    "title": "AUDIO_FFT_3BANDS_ANALYSER",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: AUDIO_FFT_3BANDS_ANALYSER (Primo 7 STR)\nᛇᚢ\nᛗᚦ fft_bands\nSET bass_level 75\nSET mid_level 50\nSET treble_level 40\nᚩᛖ bass_level\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "72_storyboard_hybrid_capture.hlx",
    "title": "STORYBOARD_HYBRID_CAPTURE",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: STORYBOARD_HYBRID_CAPTURE (Primo 97 PER)\nᛇᚢ\nᛗᚦ hybrid_capture\nSET fps_target 60\nSET frame_ready 1\nᚩᛢ storyboard_frame captured\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "73_hexagonal_domain_core.hlx",
    "title": "HEXAGONAL_DOMAIN_CORE",
    "prime": 41,
    "hlxSource": "# CELULA EXTRAIDA: HEXAGONAL_DOMAIN_CORE (Primo 41 ROT)\nᛇᚢ\nᛗᚦ hex_domain\nSET layers_count 3\nSET env_valid 1\nIF env_valid > 0\n  ᚩᛖ layers_count\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "74_chapter_book_repository.hlx",
    "title": "CHAPTER_BOOK_REPOSITORY",
    "prime": 89,
    "hlxSource": "# CELULA EXTRAIDA: CHAPTER_BOOK_REPOSITORY (Primo 89 FSD)\nᛇᚢ\nᛗᚦ chapter_repo\nSET chapters_total 12\nᚠᚷ 64\nᚩᛖ chapters_total\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "75_reading_progress_state.hlx",
    "title": "READING_PROGRESS_STATE",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: READING_PROGRESS_STATE (Primo 97 PER)\nᛇᚢ\nᛗᚦ progress_store\nSET scroll_pct 100\nᚩᛖ scroll_pct\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "76_symbiotic_dialog_service.hlx",
    "title": "SYMBIOTIC_DIALOG_SERVICE",
    "prime": 7,
    "hlxSource": "# CELULA EXTRAIDA: SYMBIOTIC_DIALOG_SERVICE (Primo 7 STR)\nᛇᚢ\nᛗᚦ dialog_svc\nSET dialog_ready 1\nᚩᛢ symbiotic_dialog active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "77_exact_decimal_ledger.hlx",
    "title": "EXACT_DECIMAL_DOUBLE_ENTRY",
    "prime": 2,
    "hlxSource": "# CELULA MAESTRA: EXACT_DECIMAL_DOUBLE_ENTRY (Primo 2 RES)\nᛇᚢ\nᛗᚦ axiom_ledger\nSET debit_cents 10000\nSET credit_cents 10000\nIF debit_cents > 0\n  SET balanced_ok 1\n  ᚩᛖ balanced_ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "78_medu_cube_lattice.hlx",
    "title": "MEDU_B3_CUBE_LATTICE",
    "prime": 13,
    "hlxSource": "# CELULA MAESTRA: MEDU_B3_CUBE_LATTICE (Primo 13 RUN)\nᛇᚢ\nᛗᚦ medu_lattice\nSET vertices_b3 8\nSET edges_b3 12\nSET faces_b3 6\nᚩᛖ vertices_b3\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "79_cristal_bundle_seal.hlx",
    "title": "CRISTAL_MERKLE_SEAL",
    "prime": 137,
    "hlxSource": "# CELULA MAESTRA: CRISTAL_MERKLE_SEAL (Primo 137 ROM)\nᛇᚢ\nᛗᚦ cristal_seal\nSET hashes_count 401\nᛟᛥ\nᚩᛢ cristal_bundle sealed\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "80_triad_hallucination_filter.hlx",
    "title": "AURORA1_ENGINEER_L2_FILTER",
    "prime": 5,
    "hlxSource": "# CELULA MAESTRA: AURORA1_ENGINEER_L2_FILTER (Primo 5 ACL)\nᛇᚢ\nᛗᚦ triad_guard\nSET zero_hallucination 1\nᚦᚩ\nᚩᛖ zero_hallucination\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "81_adaptive_persona_ui.hlx",
    "title": "ADAPTIVE_PERSONA_KID_TO_SCIENTIST",
    "prime": 71,
    "hlxSource": "# CELULA MAESTRA: ADAPTIVE_PERSONA_KID_TO_SCIENTIST (Primo 71 UID)\nᛇᚢ\nᛗᚦ persona_ui\nSET mode_didactic 1\nᚩᛖ mode_didactic\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "82_openqasm_statevector.hlx",
    "title": "OPENQASM2_STATEVECTOR_CNOT",
    "prime": 43,
    "hlxSource": "# CELULA MAESTRA: OPENQASM2_STATEVECTOR_CNOT (Primo 43 RND)\nᛇᚢ\nᛗᚦ qasm_engine\nSET qubits_cnt 2\nᛈᚫ\nᚩᛖ qubits_cnt\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "83_witness_trace_grove.hlx",
    "title": "WITNESS_OFFLINE_CERTIFICATE",
    "prime": 101,
    "hlxSource": "# CELULA MAESTRA: WITNESS_OFFLINE_CERTIFICATE (Primo 101 ECC)\nᛇᚢ\nᛗᚦ witness_cert\nSET offline_verified 1\nᚩᛖ offline_verified\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "84_microagent_swarm_worker.hlx",
    "title": "MICROAGENT_SWARM_DRONES",
    "prime": 61,
    "hlxSource": "# CELULA MAESTRA: MICROAGENT_SWARM_DRONES (Primo 61 FRK)\nᛇᚢ\nᛗᚦ swarm_workers\nSET drones_active 10\nᛒᚢ\nᚩᛖ drones_active\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "85_cpu_topology_sysfs.hlx",
    "title": "CPU_TOPOLOGY_FREQ_SYSFS",
    "prime": 53,
    "hlxSource": "# CELULA EXTRAIDA: CPU_TOPOLOGY_FREQ_SYSFS (Primo 53 CLK)\nᛇᚢ\nᛗᚦ cpu_topology\nSET logical_cpus 4\nSET freq_mhz 3200\nᛋᚹ\nᚩᛖ freq_mhz\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "86_thermal_zones_sensor.hlx",
    "title": "THERMAL_ZONES_CELSIUS",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: THERMAL_ZONES_CELSIUS (Primo 127 REG)\nᛇᚢ\nᛗᚦ thermal_sensor\nSET temp_celsius 54\nSET crit_celsius 95\nᚩᛖ temp_celsius\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "87_psi_pressure_monitor.hlx",
    "title": "PSI_CPU_IO_MEM_PRESSURE",
    "prime": 29,
    "hlxSource": "# CELULA EXTRAIDA: PSI_CPU_IO_MEM_PRESSURE (Primo 29 PRI)\nᛇᚢ\nᛗᚦ psi_monitor\nSET avg10_pct 12\nᚾ\nᚩᛖ avg10_pct\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "88_ttl_snapshot_ratelimit.hlx",
    "title": "TTL_SNAPSHOT_TOKEN_BUCKET",
    "prime": 31,
    "hlxSource": "# CELULA EXTRAIDA: TTL_SNAPSHOT_TOKEN_BUCKET (Primo 31 LCK)\nᛇᚢ\nᛗᚦ rate_limiter\nSET ttl_ms 500\nSET bucket_tokens 10\nᚠᛁ\nᚩᛖ bucket_tokens\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "89_thermal_alerts_ringbuf.hlx",
    "title": "THERMAL_ALERTS_RING_BUFFER",
    "prime": 23,
    "hlxSource": "# CELULA EXTRAIDA: THERMAL_ALERTS_RING_BUFFER (Primo 23 TRP)\nᛇᚢ\nᛗᚦ alert_engine\nSET temp_now 54\nSET warn_limit 80\nIF temp_now > 80\n  ᚻ\nEND\nᚩᛖ temp_now\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "90_prometheus_openmetrics.hlx",
    "title": "PROMETHEUS_OPENMETRICS_EXPORTER",
    "prime": 67,
    "hlxSource": "# CELULA EXTRAIDA: PROMETHEUS_OPENMETRICS_EXPORTER (Primo 67 BUS)\nᛇᚢ\nᛗᚦ prom_metrics\nSET metrics_ready 1\nᚩᛖ metrics_ready\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "91_soa_freelist_pool.hlx",
    "title": "SOA_BUFFER_FREELIST_POOL",
    "prime": 17,
    "hlxSource": "# CELULA EXTRAIDA: SOA_BUFFER_FREELIST_POOL (Primo 17 ALC)\nᛇᚢ\nᛗᚦ buffer_pool\nᚠᚷ 64\nSET free_slots 64\nᚩᛖ free_slots\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "92_undo_redo_command_stack.hlx",
    "title": "UNDO_REDO_COMMAND_HISTORY",
    "prime": 37,
    "hlxSource": "# CELULA EXTRAIDA: UNDO_REDO_COMMAND_HISTORY (Primo 37 EPC)\nᛇᚢ\nᛗᚦ history_cmd\nSET stack_depth 32\nSET cursor_pos 1\nᚩᛖ stack_depth\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "93_transform_gizmo_3d.hlx",
    "title": "TRANSFORM_GIZMO_MULTISELECT",
    "prime": 103,
    "hlxSource": "# CELULA EXTRAIDA: TRANSFORM_GIZMO_MULTISELECT (Primo 103 PTR)\nᛇᚢ\nᛗᚦ gizmo_3d\nSET gizmo_mode 1\nᚣ\nᚩᛖ gizmo_mode\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "94_outliner_inspector_hud.hlx",
    "title": "OUTLINER_INSPECTOR_HUD",
    "prime": 127,
    "hlxSource": "# CELULA EXTRAIDA: OUTLINER_INSPECTOR_HUD (Primo 127 REG)\nᛇᚢ\nᛗᚦ outliner_ui\nSET entities_cnt 8\nᚩᛖ entities_cnt\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "95_scene_schema_serializer.hlx",
    "title": "SCENE_JSON_SCHEMA_VALIDATOR",
    "prime": 97,
    "hlxSource": "# CELULA EXTRAIDA: SCENE_JSON_SCHEMA_VALIDATOR (Primo 97 PER)\nᛇᚢ\nᛗᚦ scene_io\nSET schema_valid 1\nIF schema_valid > 0\n  ᚩᛢ scene_serialized ok\nEND\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "96_procedural_seed_spawner.hlx",
    "title": "PROCEDURAL_MULBERRY32_SPAWNER",
    "prime": 61,
    "hlxSource": "# CELULA EXTRAIDA: PROCEDURAL_MULBERRY32_SPAWNER (Primo 61 FRK)\nᛇᚢ\nᛗᚦ proc_spawner\nSET spawn_count 16\nᛈᚫ\nᛒᚢ\nᚩᛖ spawn_count\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "97_terrain_fbm_heightmap.hlx",
    "title": "TERRAIN_FBM_RIDGED_MESH",
    "prime": 89,
    "hlxSource": "# CELULA EXTRAIDA: TERRAIN_FBM_RIDGED_MESH (Primo 89 FSD)\nᛇᚢ\nᛗᚦ terrain_fbm\nSET octaves 4\nᚠᛜ terrain_grid prism 960 1.5\nᛟᛣ terrain_grid 0.88 0.45 0.12\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "98_rigid_body_collisions.hlx",
    "title": "RIGID_BODY_COLLISION_WORLD",
    "prime": 3,
    "hlxSource": "# CELULA EXTRAIDA: RIGID_BODY_COLLISION_WORLD (Primo 3 INI)\nᛇᚢ\nᛗᚦ rigid_physics\nSET gravity_cms2 981\nSET mass_kg 10\nᚢ\nᚩᛖ gravity_cms2\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "99_camera_keyframe_solver.hlx",
    "title": "CAMERA_KEYFRAME_SOLVER",
    "prime": 11,
    "hlxSource": "# CELULA EXTRAIDA: CAMERA_KEYFRAME_SOLVER (Primo 11 RTE)\nᛇᚢ\nᛗᚦ cam_director\nSET keyframes_cnt 8\nᚱᚣ 0.0 4.0 10.0 0 15 55\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "quantum_gates.hlx",
    "title": "QUANTUM_GATES_P33",
    "prime": 7,
    "hlxSource": "# CELULA NATIVA HELIX: QUANTUM_GATES_P33\nᛇᚢ\nᛗᚦ quantum_alu\nSET p0 100\nSET p1 0\nSET gate_mode 1\nIF gate_mode > 0\n  DIV p0 2\n  ADD p1 50\n  ᚩᛖ p0\n  ᚩᛖ p1\nEND\nᚩᛢ quantum_gate superposition_verified\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "qubit_bloch.hlx",
    "title": "QUBIT_BLOCH_6DOF",
    "prime": 7,
    "hlxSource": "# CELULA NATIVA HELIX: QUBIT_BLOCH_6DOF\nᛇᚢ\nᛗᚦ student_quantum\nSET theta 0.0\nSET phi 0.0\nᚠᛜ bloch_sphere sphere 640 1.0\nᛟᛣ bloch_sphere 0.95 0.15 0.90\nᚠᛜ state_vector capsule 240 0.85\nᚱᚳ\nᚩᛢ quantum_state bloch_ready\nᛣᚪ\nᚳᛏ"
  },
  {
    "fileName": "student_ui.hlx",
    "title": "STUDENT_LAB_UI",
    "prime": 7,
    "hlxSource": "# CELULA NATIVA HELIX: STUDENT_LAB_UI\nᛇᚢ\nᛗᚦ ui_renderer\nSET lab_level 1\nSET show_guide 1\nᚠᚷ 128\nᚩᛖ lab_level\nᚠᛠ\nᛣᚪ\nᚳᛏ"
  }
];
