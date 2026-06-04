import React, { useState } from 'react';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSettings, DEFAULT_MESSAGES, type MessageTemplates } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { Settings, MessageCircle, Receipt, MessageSquare, RotateCcw } from 'lucide-react';

const TEMPLATE_VARS = ['{name}', '{service}', '{fee}', '{gst}', '{net}', '{paid}', '{balance}'];

const MESSAGE_CONFIGS: { key: keyof MessageTemplates; label: string; when: string }[] = [
  { key: 'welcome',          label: 'Welcome',          when: 'When a new lead is created' },
  { key: 'under_process',    label: 'Under Process',    when: 'Status → Under Process' },
  { key: 'submitted',        label: 'Submitted',        when: 'Status → Submitted' },
  { key: 'completed',        label: 'Completed',        when: 'Status → Completed' },
  { key: 'cancelled',        label: 'Cancelled',        when: 'Status → Cancelled' },
  { key: 'payment_received', label: 'Payment Received', when: 'When a payment is recorded' },
  { key: 'payment_reminder', label: 'Payment Reminder', when: 'Sent as a balance reminder' },
];

export default function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    waNumber: settings.waNumber,
    businessName: settings.businessName,
    serviceGSTRate: settings.serviceGSTRate,
    bankGSTRate: settings.bankGSTRate,
  });
  const [messages, setMessages] = useState<MessageTemplates>({ ...settings.messages });

  const setField = (k: keyof typeof form, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const setMsg = (key: keyof MessageTemplates, value: string) =>
    setMessages(m => ({ ...m, [key]: value }));

  const resetMsg = (key: keyof MessageTemplates) =>
    setMessages(m => ({ ...m, [key]: DEFAULT_MESSAGES[key] }));

  const handleSave = () => {
    saveSettings({
      waNumber: form.waNumber.trim(),
      businessName: form.businessName.trim(),
      serviceGSTRate: Number(form.serviceGSTRate) || 18,
      bankGSTRate: Number(form.bankGSTRate) || 18,
      messages,
    });
    toast({ title: 'Settings saved', description: 'All preferences have been updated.' });
  };

  const sR = Number(form.serviceGSTRate || 18);
  const bR = Number(form.bankGSTRate || 18);

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure WhatsApp number, GST rates, and message templates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp / Business */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp &amp; Business
              </CardTitle>
              <CardDescription>Agency details shown in messages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input
                  value={form.businessName}
                  onChange={e => setField('businessName', e.target.value)}
                  placeholder="e.g. Nasir Travel Agency"
                />
              </div>
              <div>
                <Label>WhatsApp Sender Number</Label>
                <Input
                  value={form.waNumber}
                  onChange={e => setField('waNumber', e.target.value)}
                  placeholder="e.g. 919876543210 (with country code)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include country code without + (e.g. 91 for India).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GST Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600" />
                GST Rates
              </CardTitle>
              <CardDescription>
                Both GSTs extracted from the client's total. Bank GST applies only for non-cash payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Service GST Rate (%)</Label>
                <Input
                  type="number" min={0} max={100}
                  value={form.serviceGSTRate}
                  onChange={e => setField('serviceGSTRate', e.target.value)}
                  placeholder="18"
                />
                <p className="text-xs text-muted-foreground mt-1">All payments including cash. Default: 18%</p>
              </div>
              <div>
                <Label>Bank GST Rate (%)</Label>
                <Input
                  type="number" min={0} max={100}
                  value={form.bankGSTRate}
                  onChange={e => setField('bankGSTRate', e.target.value)}
                  placeholder="18"
                />
                <p className="text-xs text-muted-foreground mt-1">UPI / Bank / Cheque / Other only. Default: 18%</p>
              </div>
              <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground mb-2">Preview — ₹2,000 fee</p>
                <p className="font-medium">Cash:</p>
                <p className="pl-3">Service GST = ₹{Math.round(2000 * sR / (100 + sR))} &nbsp;|&nbsp; Net = ₹{Math.round(2000 * 100 / (100 + sR))}</p>
                <p className="font-medium mt-1">Bank/UPI:</p>
                <p className="pl-3">Service GST = ₹{Math.round(2000 * sR / (100 + sR + bR))} + Bank GST = ₹{Math.round(2000 * bR / (100 + sR + bR))} &nbsp;|&nbsp; Net = ₹{Math.round(2000 * 100 / (100 + sR + bR))}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              WhatsApp Message Templates
            </CardTitle>
            <CardDescription>
              Customize the message sent for each event. Use variables below — they are replaced automatically with lead data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Variable reference */}
            <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground self-center mr-1 font-medium">Available variables:</span>
              {TEMPLATE_VARS.map(v => (
                <Badge key={v} variant="secondary" className="font-mono text-xs cursor-default">{v}</Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MESSAGE_CONFIGS.map(({ key, label, when }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">{label}</Label>
                      <p className="text-xs text-muted-foreground">{when}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => resetMsg(key)}
                      title="Reset to default"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                  <Textarea
                    value={messages[key]}
                    onChange={e => setMsg(key, e.target.value)}
                    rows={5}
                    className="font-mono text-xs resize-y"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="px-8">Save All Settings</Button>
      </div>
    </SidebarLayout>
  );
}
