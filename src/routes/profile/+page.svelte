<script lang='ts'>
	import { Button } from '../../lib/components/ui/button';
	import { Card, CardContent, CardHeader } from '../../lib/components/ui/card';
	import Input from '../../lib/components/ui/input/input.svelte';
	import { Label } from '../../lib/components/ui/label';
  import { enhance } from '$app/forms';

  const { data } = $props()
  const {userProfile} = data;

  let name = $state('');
  let email = $state('');
  let octopusAccountID = $state('');
  let octopusAPIKey = $state('');
  let octopusTariff = $state('');

  $effect(() => {
    if (userProfile) {
      name = userProfile.name;
      email = userProfile.email;
      octopusAccountID = userProfile.octopusAccountId;
      octopusAPIKey = userProfile.octopusAPIKey;
      octopusTariff = userProfile.octopusTariff || '';
    }
  });

</script>
{#if userProfile}
<div class='flex flex-col items-center gap-5'>
  <Card class='w-full max-w-xl'>
    <CardContent>
      <form class='flex flex-col gap-2' method="post" use:enhance={({formData}) => {
        formData.set('name', name);
        formData.set('email', email);
        formData.set('octopusAccountId', octopusAccountID);
        formData.set('octopusAPIKey', octopusAPIKey);
        return ({result}) => {
          if (result.type === 'success') {
            window.location.reload();
          } else {
            alert('Failed to update profile');
          }
        };
      }}>
          <div>    
            <Label>Email</Label>
            <Input bind:value={email}/>
          </div>
          <div>    
            <Label>Name</Label>
            <Input bind:value={name}/>
          </div>
          <div>    
            <Label>Octopus Account Id</Label>
            <Input bind:value={octopusAccountID}/>
          </div>
          <div>    
            <Label>Octopus API Key</Label>
            <Input type='password' bind:value={octopusAPIKey} />
          </div>
          <div>
            <Label>Octopus Tariff Code</Label>
            <Input bind:value={octopusTariff} disabled />
          </div>
          <div>
            <Button type='submit'>Update</Button>
          </div>
      </form>
    </CardContent>
  </Card>
</div>
{/if}