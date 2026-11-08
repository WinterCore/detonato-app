import { BellSlashIcon, CaretLeftIcon, CaretRightIcon, DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import { POSY_URL, REPO_URL } from '@/lib/links'
import { useBackup } from '@/screens/settings/hooks/useBackup'
import { useSettings } from '@/screens/settings/hooks/useSettings'
import { Card, IconButton, LinkRow, Row, Segmented, Stepper, Swatch, SwitchRow, TextLink, TopBar } from '@/ui'
import { Notice } from './Notice'
import { RestoreSheet } from './RestoreSheet'
import { Section } from './Section'
import { SoundSheet } from './SoundSheet'
import { StyleRow } from './StyleRow'

const BACKUP_NOTE = 'Save your tasks, their history and your settings to a file, to bring them back after the phone clears its storage, or onto a new phone.'

/** «Settings»: how the display looks, how a session runs and ends, the calendar, and a backup. */
export function Settings() {
  const s = useSettings()
  const { picker, ...backup } = useBackup()

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col pb-[calc(32px+env(safe-area-inset-bottom))]">
      <TopBar start={<IconButton icon={CaretLeftIcon} label="Back" onClick={s.back} />} title="Settings" />

      <div className="flex flex-col gap-3 px-4">
        <Section id="display" title="Display">
          <Card>
            <StyleRow line={s.style} onOpen={s.openStyle} />
            <Row label="LED colour" labelId="led">
              <div role="radiogroup" aria-labelledby="led" className="flex gap-1.5">
                {s.leds.map((o) => (
                  <Swatch key={o.value} color={o.color} label={o.label} checked={o.checked} onClick={() => s.pickLed(o.value)} />
                ))}
              </div>
            </Row>
            <Row label="Unlit segments" meta="Faint outline of every segment" labelId="ghost">
              <Segmented options={s.ghosts} onPick={s.pickGhost} labelledBy="ghost" />
            </Row>
            <SwitchRow checked={s.glow} label="Glow" onClick={s.toggleGlow} />
          </Card>
        </Section>

        <Section id="timer" title="Timer">
          <Card>
            <Row label="Default session" meta="For tasks without their own length, and quick sessions">
              <Stepper
                lessLabel="Shorter default"
                moreLabel="Longer default"
                onLess={s.shorter}
                onMore={s.longer}
                atMin={s.length.atMin}
                atMax={s.length.atMax}
              >
                <Display text={s.length.text} size="28px" label={s.length.label} />
              </Stepper>
            </Row>
            <SwitchRow checked={s.keepAwake} label="Keep screen on" meta="While a session runs" onClick={s.toggleKeepAwake} />
          </Card>
        </Section>

        <Section id="alerts" title="Alerts">
          {/* Above the switches, so it's seen before they're tried. */}
          {s.notifyBlocked && (
            <Notice
              icon={BellSlashIcon}
              title="Notifications are off"
              line="A session’s end can’t reach you with the app closed until the phone allows Detonato to notify."
              action="Open phone settings"
              onOpen={s.openPhoneSettings}
            />
          )}
          <Card>
            {s.notify !== null && (
              <SwitchRow
                checked={s.notify}
                label="Notify when a session ends"
                meta="Even with the app closed or the phone locked"
                onClick={() => void s.toggleNotify()}
              />
            )}
            <LinkRow
              label="Sound"
              meta="When a session ends"
              end={
                <>
                  {s.sound}
                  <CaretRightIcon size={18} className="text-ink-3" />
                </>
              }
              onClick={s.openSound}
            />
            <SwitchRow checked={s.haptics} label="Haptics" meta="A buzz when a session ends" onClick={s.toggleHaptics} />
          </Card>
        </Section>

        <Section id="calendar" title="Calendar">
          <Card>
            <Row label="Week starts on" labelId="week-start">
              <Segmented options={s.weekStarts} onPick={s.pickWeekStart} labelledBy="week-start" />
            </Row>
          </Card>
        </Section>

        <Section id="data" title="Data" notes={[BACKUP_NOTE]}>
          <Card>
            <LinkRow label="Export backup" end={<DownloadSimpleIcon size={20} className="text-ink-3" />} onClick={backup.save} />
            <LinkRow label="Import backup" end={<UploadSimpleIcon size={20} className="text-ink-3" />} onClick={backup.pick} />
          </Card>
        </Section>

        <footer className="flex flex-col gap-1 px-1 pt-4 text-meta text-ink-3">
          <p>
            Segment designs by <TextLink href={POSY_URL}>Posy (Michiel de Boer)</TextLink>, from the Segmented Display Designs Sheet v1.1.
          </p>
          <p>
            Detonato is non-commercial and open source: <TextLink href={REPO_URL}>github.com/WinterCore/detonato-app</TextLink>
          </p>
          <p className="font-mono">{s.version}</p>
        </footer>
      </div>

      <input
        ref={picker}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void backup.onPicked(e)}
      />
      <SoundSheet open={s.soundOpen} sounds={s.sounds} onPick={s.pickSound} onClose={s.closeSound} />
      <RestoreSheet restoring={backup.restoring} onRestore={backup.restore} onCancel={backup.cancel} />
    </main>
  )
}
