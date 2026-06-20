import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ModelPickerModal } from './ModelPickerModal';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useHermesDashboard } from '@/hooks/useHermesDashboard';
import { hermes } from '@/lib/hermes';
import { hermesDashboard } from '@/lib/hermesDashboard';
import {
  clearDashboardCredentials,
  getDashboardPassword,
  getDashboardUsername,
  setDashboardCredentials,
} from '@/lib/hermesDashboardConfig';
import {
  dbGetHermesDashboardUrl,
  dbGetHermesUrl,
  dbResetHermesDashboardUrl,
  dbResetHermesUrl,
  dbSetHermesDashboardUrl,
  dbSetHermesUrl,
  DEFAULT_HERMES_DASHBOARD_URL,
  DEFAULT_HERMES_URL,
} from '@/lib/db';
import {
  clearHermesApiKey,
  getHermesApiKey,
  setHermesApiKey,
} from '@/lib/hermesConfig';

function InsetHairline({ C }: { C: ThemeColors }) {
  return <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }} />;
}

function FieldLabel({ children, C }: { children: string; C: ThemeColors }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        fontFamily: MONO,
        color: C.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function UrlField({
  value,
  onChange,
  onSave,
  dirty,
  placeholder,
  C,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  dirty: boolean;
  placeholder: string;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: C.hairline,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      {dirty ? (
        <Pressable
          onPress={onSave}
          style={({ pressed }) => ({
            backgroundColor: C.text,
            borderRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: MONO, color: C.background }}>
            save
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HermesIntegrationsBlock({ C }: { C: ThemeColors }) {
  const dashboard = useHermesDashboard();
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlDirty, setApiUrlDirty] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [apiTest, setApiTest] = useState<string | null>(null);
  const [apiTesting, setApiTesting] = useState(false);

  const [dashUrl, setDashUrl] = useState('');
  const [dashUrlDirty, setDashUrlDirty] = useState(false);
  const [dashUser, setDashUser] = useState('');
  const [dashUserDirty, setDashUserDirty] = useState(false);
  const [dashPass, setDashPass] = useState('');
  const [dashPassDirty, setDashPassDirty] = useState(false);
  const [dashTest, setDashTest] = useState<string | null>(null);
  const [dashTesting, setDashTesting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    setApiUrl(dbGetHermesUrl());
    setDashUrl(dbGetHermesDashboardUrl());
    getHermesApiKey().then((k) => {
      if (k) setApiKey(k);
    });
    getDashboardUsername().then((u) => {
      if (u) setDashUser(u);
    });
    getDashboardPassword().then((p) => {
      if (p) setDashPass(p);
    });
  }, []);

  async function saveApiUrl() {
    if (!apiUrl.trim()) return;
    Keyboard.dismiss();
    dbSetHermesUrl(apiUrl);
    setApiUrlDirty(false);
    setApiTest(null);
  }

  async function saveApiKey() {
    Keyboard.dismiss();
    await setHermesApiKey(apiKey);
    setApiKeyDirty(false);
    setApiTest(null);
  }

  async function saveDashUrl() {
    if (!dashUrl.trim()) return;
    Keyboard.dismiss();
    dbSetHermesDashboardUrl(dashUrl);
    setDashUrlDirty(false);
    setDashTest(null);
  }

  async function saveDashCreds() {
    Keyboard.dismiss();
    await setDashboardCredentials(dashUser, dashPass);
    setDashUserDirty(false);
    setDashPassDirty(false);
    setDashTest(null);
  }

  async function testApi() {
    setApiTesting(true);
    setApiTest(null);
    try {
      if (apiUrlDirty) dbSetHermesUrl(apiUrl);
      if (apiKeyDirty) await setHermesApiKey(apiKey);
      setApiUrlDirty(false);
      setApiKeyDirty(false);
      const health = await hermes.getHealth();
      setApiTest(health.status === 'ok' ? 'connected' : 'unexpected');
    } catch (e) {
      setApiTest(e instanceof Error ? e.message : 'failed');
    } finally {
      setApiTesting(false);
    }
  }

  async function testDashboard() {
    setDashTesting(true);
    setDashTest(null);
    try {
      if (dashUrlDirty) dbSetHermesDashboardUrl(dashUrl);
      if (dashUserDirty || dashPassDirty) await setDashboardCredentials(dashUser, dashPass);
      setDashUrlDirty(false);
      setDashUserDirty(false);
      setDashPassDirty(false);
      await hermesDashboard.login();
      setDashTest('logged in');
      dashboard.refresh();
    } catch (e) {
      setDashTest(e instanceof Error ? e.message : 'failed');
    } finally {
      setDashTesting(false);
    }
  }

  function resetAll() {
    Alert.alert('Reset Hermes', 'Clear API server and dashboard settings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          dbResetHermesUrl();
          dbResetHermesDashboardUrl();
          await clearHermesApiKey();
          await clearDashboardCredentials();
          setApiUrl(DEFAULT_HERMES_URL);
          setDashUrl(DEFAULT_HERMES_DASHBOARD_URL);
          setApiKey('');
          setDashUser('');
          setDashPass('');
          setApiUrlDirty(false);
          setDashUrlDirty(false);
          setApiKeyDirty(false);
          setDashUserDirty(false);
          setDashPassDirty(false);
          setApiTest(null);
          setDashTest(null);
          dashboard.refresh();
        },
      },
    ]);
  }

  const main = dashboard.auxiliary?.main;

  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
        <FieldLabel C={C}>api server :8642</FieldLabel>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <FieldLabel C={C}>base url</FieldLabel>
        <UrlField
          C={C}
          value={apiUrl}
          onChange={(v) => {
            setApiUrl(v);
            setApiUrlDirty(true);
            setApiTest(null);
          }}
          onSave={saveApiUrl}
          dirty={apiUrlDirty}
          placeholder="http://100.101.101.101:8642"
        />
      </View>
      <InsetHairline C={C} />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <FieldLabel C={C}>api key</FieldLabel>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <TextInput
            value={apiKey}
            onChangeText={(v) => {
              setApiKey(v);
              setApiKeyDirty(true);
              setApiTest(null);
            }}
            placeholder="bearer token"
            placeholderTextColor={C.textSecondary}
            secureTextEntry
            style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={saveApiKey}
          />
          {apiKeyDirty ? (
            <Pressable
              onPress={saveApiKey}
              style={({ pressed }) => ({
                backgroundColor: C.text,
                borderRadius: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: MONO, color: C.background }}>
                save
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <InsetHairline C={C} />
      <Pressable
        onPress={testApi}
        disabled={apiTesting}
        style={({ pressed }) => ({
          paddingHorizontal: 20,
          paddingVertical: 12,
          opacity: pressed || apiTesting ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>
          {apiTesting ? 'testing api…' : 'test api server'}
        </Text>
        {apiTest ? (
          <Text
            style={{
              fontSize: 11,
              fontFamily: MONO,
              color: apiTest === 'connected' ? C.statusActive : C.destructive,
              marginTop: 2,
            }}
          >
            {apiTest}
          </Text>
        ) : null}
      </Pressable>

      <InsetHairline C={C} />

      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
        <FieldLabel C={C}>dashboard :9119</FieldLabel>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <FieldLabel C={C}>base url</FieldLabel>
        <UrlField
          C={C}
          value={dashUrl}
          onChange={(v) => {
            setDashUrl(v);
            setDashUrlDirty(true);
            setDashTest(null);
          }}
          onSave={saveDashUrl}
          dirty={dashUrlDirty}
          placeholder="http://100.101.101.101:9119"
        />
      </View>
      <InsetHairline C={C} />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <FieldLabel C={C}>username</FieldLabel>
        <View style={{ borderWidth: 1, borderColor: C.hairline, paddingHorizontal: 12, paddingVertical: 10 }}>
          <TextInput
            value={dashUser}
            onChangeText={(v) => {
              setDashUser(v);
              setDashUserDirty(true);
              setDashTest(null);
            }}
            placeholder="dashboard user"
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            style={{ fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
          />
        </View>
      </View>
      <InsetHairline C={C} />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <FieldLabel C={C}>password</FieldLabel>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <TextInput
            value={dashPass}
            onChangeText={(v) => {
              setDashPass(v);
              setDashPassDirty(true);
              setDashTest(null);
            }}
            placeholder="dashboard password"
            placeholderTextColor={C.textSecondary}
            secureTextEntry
            style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
          />
          {(dashUserDirty || dashPassDirty) && (
            <Pressable
              onPress={saveDashCreds}
              style={({ pressed }) => ({
                backgroundColor: C.text,
                borderRadius: 4,
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: MONO, color: C.background }}>
                save
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <InsetHairline C={C} />
      <Pressable
        onPress={testDashboard}
        disabled={dashTesting}
        style={({ pressed }) => ({
          paddingHorizontal: 20,
          paddingVertical: 12,
          opacity: pressed || dashTesting ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>
          {dashTesting ? 'logging in…' : 'test dashboard login'}
        </Text>
        {dashTest ? (
          <Text
            style={{
              fontSize: 11,
              fontFamily: MONO,
              color: dashTest === 'logged in' ? C.statusActive : C.destructive,
              marginTop: 2,
            }}
          >
            {dashTest}
          </Text>
        ) : null}
      </Pressable>

      {dashboard.authenticated && dashboard.status ? (
        <>
          <InsetHairline C={C} />
          <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: MONO, color: C.textSecondary, letterSpacing: 0.8 }}>
              SERVER
            </Text>
            <Text style={{ fontSize: 12, fontFamily: MONO, color: C.text }}>
              gateway {dashboard.status.gateway_state} · v{dashboard.status.version}
            </Text>
            {dashboard.mainModelLabel ? (
              <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>
                main: {dashboard.mainModelLabel}
              </Text>
            ) : null}
          </View>
          <InsetHairline C={C} />
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.text }}>
              change main model
            </Text>
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2 }}>
              applies to new chat sessions
            </Text>
          </Pressable>
          <InsetHairline C={C} />
          <Pressable
            onPress={async () => {
              setActionBusy(true);
              try {
                await dashboard.resetAuxiliary();
                Alert.alert('Done', 'Auxiliary models reset to auto.');
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Reset failed');
              } finally {
                setActionBusy(false);
              }
            }}
            disabled={actionBusy}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed || actionBusy ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>reset auxiliary models</Text>
          </Pressable>
          <InsetHairline C={C} />
          <Pressable
            onPress={() => {
              Alert.alert('Restart gateway?', 'Messaging channels may briefly disconnect.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restart',
                  style: 'destructive',
                  onPress: async () => {
                    setActionBusy(true);
                    try {
                      await dashboard.restartGateway();
                      Alert.alert('Sent', 'Gateway restart requested.');
                    } catch (e) {
                      Alert.alert('Error', e instanceof Error ? e.message : 'Restart failed');
                    } finally {
                      setActionBusy(false);
                    }
                  },
                },
              ]);
            }}
            disabled={actionBusy}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed || actionBusy ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.destructive }}>restart gateway</Text>
          </Pressable>
        </>
      ) : null}

      <InsetHairline C={C} />
      <Pressable
        onPress={resetAll}
        style={({ pressed }) => ({
          paddingHorizontal: 20,
          paddingVertical: 14,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.destructive }}>
          reset hermes config
        </Text>
      </Pressable>

      <ModelPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        options={dashboard.options}
        loading={dashboard.loading}
        currentProvider={main?.provider}
        currentModel={main?.model}
        onSelect={dashboard.setMainModel}
        C={C}
      />
    </>
  );
}
