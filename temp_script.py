from pathlib import Path
path = Path('src/pages/admin/Groups.tsx')
data = path.read_text()
start = data.index('          {membersDialogGroup && (')
end = data.index('        </DialogContent>', start)
new = """          {membersDialogGroup && (
            <div class=\"flex flex-1 flex-col\">
              <div class=\"flex-1 overflow-y-auto space-y-4 pr-2\">
                <h3 class=\"font-medium text-sm text-muted-foreground\">Esami nariai</h3>
                {membersDialogGroup.members.length === 0 ? (
                  <p class=\"text-sm text-muted-foreground\">Šioje grupeje dar nera nariu.</p>
                ) : (
                  membersDialogGroup.members.map((member) => (
                    <GroupMemberRow
                      key={member.id}
                      member={member}
                      onRemove={() =>
                        removeMemberMutation.mutate({
                          groupId: membersDialogGroup.id,
                          userId: member.userId,
                        })
                      }
                      isRemoving={removeMemberMutation.isPending}
                    />
                  ))
                )}
                <div class=\"space-y-4\">
                  <div>
                    <h3 class=\"text-lg font-semibold\">Prideti nari</h3>
                    <p class=\"text-sm text-muted-foreground\">Pasirinkite vartotoja ir, jei reikia, konkretu avili.</p>
                  </div>
                  <div class=\"space-y-4\">
                    <div class=\"space-y-3\">
                      <div class=\"space-y-2\">
                        <Label htmlFor=\"group-member-search\">Paieška pagal vartotoja</Label>
                        <Input
                          id=\"group-member-search\"
                          placeholder=\"Ieškoti el. pašto...\"
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                          disabled={addMemberMutation.isPending}
                        />
                      </div>
                      <div class=\"rounded-md border border-border/70 bg-background\">
                        {availableMembers.length === 0 ? (
                          <p class=\"px-4 py-2 text-sm text-muted-foreground\">Nera vartotoju</p>
                        ) : (
                          <div class=\"max-h-64 overflow-y-auto\">
                            {availableMembers.map((candidate) => (
                              <button
                                key={candidate.id}
                                type=\"button\"
                                className={`flex w-full items-center justify-between border-b border-border/40 px-4 py-2 text-left text-sm transition-colors ${
                                  candidate.id === memberToAdd
                                    ? 'bg-muted/30 font-medium'
                                    : 'hover:bg-muted/30'
                                }`}
                                onClick={() => setMemberToAdd(candidate.id)}
                                disabled={addMemberMutation.isPending}
                              >
                                <span>{mapToOptionLabel(candidate)}</span>
                                {candidate.id === memberToAdd ? (
                                  <Badge variant=\"outline\">Pasirinktas</Badge>
                                ) : null}
                              </button>
                            ))}
                            <div class=\"h-px w-full bg-border/70 last:hidden\" />
                          </div>
                        )}
                      </div>
                    </div>
                    {memberToAdd && (
                      <div class=\"space-y-2\">
                        <div class=\"flex items-center justify-between\">
                          <Label>Aviliai</Label>
                          <Button
                            variant=\"ghost\"
                            size=\"sm\"
                            onClick={() => setShowArchivedHives((prev) => !prev)}
                          >
                            {showArchivedHives ? 'Slepti archyvuotus' : 'Rodyti archyvuotus'}
                          </Button>
                        </div>
                        <div class=\"rounded-md border border-border/70 p-3\">
                          <label class=\"flex items-center gap-2 text-sm\">
                            <input
                              type=\"checkbox\"
                              checked={isAllSelected}
                              onChange={toggleAllHives}
                            />
                            <span>Visi aviliai</span>
                          </label>
                          <div class=\"mt-2 space-y-2 max-h-[20rem] overflow-y-auto\">
                            {userHivesLoading ? (
                              <p class=\"text-sm text-muted-foreground\">Kraunama...</p>
                            ) : sortedUserHives.length > 0 ? (
                              sortedUserHives.map((hive) => (
                                <label
                                  key={hive.id}
                                  class=\"flex items-center justify-between gap-2 rounded-md bg-muted/5 px-3 py-2 text-sm\"
                                >
                                  <div class=\"flex items-center gap-2\">
                                    <input
                                      type=\"checkbox\"
                                      checked={selectedHives.includes(hive.id)}
                                      onChange={() => toggleHiveSelection(hive.id)}
                                      disabled={isAllSelected}
                                    />
                                    <div class=\"flex flex-col\">
                                      <span class=\"font-medium\">{hive.label}</span>
                                      <span class=\"text-xs text-muted-foreground\">
                                        {hive.location ?? 'Lokacija nenustatyta'}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <p class=\"text-sm text-muted-foreground\">Vartotojas neturi aviliu</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div class=\"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end\">
                      <Button
                        className=\"sm:w-auto\"
                        onClick={handleAddMember}
                        disabled={!canAddMember || addMemberMutation.isPending}
                      >
                        {addMemberMutation.isPending ? (
                          <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                        ) : (
                          <UserPlus className=\"mr-2 h-4 w-4\" />
                        )}
                        Prideti nari
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
"""
path.write_text(data[:start] + new + data[end:])
try:
    Path('temp_script.py').unlink()
except FileNotFoundError:
    pass
